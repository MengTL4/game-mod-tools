declare const nw: any;

(function () {
  const fs = require("fs");
  const path = require("path");
  const childProcess = require("child_process");

  const paths = Zs2Gui.Paths.create(process.cwd());
  const {
    projectRoot,
    rootDir,
    trainerGameExe,
    bridgeExtensionDir,
    bridgeDir,
    saveDir,
    iconDir,
    iconSetPath
  } = paths;
  const bridgeClient = Zs2Gui.BridgeClient.create(paths);
  const EXPECTED_BRIDGE_VERSION = Zs2Gui.Config.EXPECTED_BRIDGE_VERSION;

  const $ = (id: string): any => Zs2Gui.Dom.byId(document, id);
  const dom = Zs2Gui.Dom.create(document);

  let lastEventSize = 0;
  let switchValue = true;
  let gameProcess: any = null;
  let latestState: any = null;
  let recordedPosition: any = null;
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let babyOptionsSignature = "";
  let activeToolTab = "core";
  let offlineHuntMode = "map";
  const activeToolSections: Record<string, string> = {
    core: "gold",
    catalog: "item",
    baby: "skill",
    progress: "title",
    offline: "map",
    world: "map",
    misc: "variable",
    debug: "command"
  };
  const itemKindLabels: Record<string, string> = {
    item: "物品",
    weapon: "武器",
    armor: "防具"
  };
  let selectedItemKind = "item";
  const catalogs: Record<string, any[]> = Zs2Gui.Catalogs.loadCatalogs({
    dataDir: paths.dataDir,
    useDataDir: paths.useDataDir,
    costumeDataPath: paths.costumeDataPath,
    itemKindLabels,
    readJson,
    looseNumber
  });
  const iconRenderer = Zs2Gui.IconRenderer.create({
    iconSetPath,
    iconDir,
    documentRef: document,
    imageCtor: Image,
    escapeHtml,
    showToast,
    onReady: () => renderCatalogs()
  });

  process.env.ZS2_MODKIT_ROOT = projectRoot;
  process.env.ZS2_GAME_ROOT = rootDir;

  function readJson(file) {
    try {
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return null;
    }
  }

  function catalogName(kind, id) {
    return Zs2Gui.Catalogs.catalogName(catalogs, kind, id);
  }

  function catalogEntry(kind, id) {
    return Zs2Gui.Catalogs.catalogEntry(catalogs, kind, id);
  }

  function selectedNumber(id) {
    return Number(numberValue(id, NaN));
  }

  function parseItemSelection() {
    const raw = String($("itemId").value || "").trim();
    const match = raw.match(/^(item|weapon|armor)\s*:\s*(\d+)$/i);
    if (match) {
      return { kind: match[1].toLowerCase(), id: Number(match[2]), raw: `${match[1].toLowerCase()}:${match[2]}` };
    }
    const chooserKind = $("itemKind").value;
    const kind = chooserKind === "all" ? selectedItemKind : chooserKind;
    return { kind, id: numberValue("itemId", NaN), raw };
  }

  function itemSelectionKey(selection) {
    return `${selection.kind}:${selection.id}`;
  }

  function debounce(fn, delay = 120) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function viewportScale() {
    const visualViewport = (window as any).visualViewport;
    const visualScale = Number(visualViewport && visualViewport.scale || 1);
    const deviceScale = Number(window.devicePixelRatio || 1);
    return Math.max(1, visualScale, deviceScale);
  }

  const catalogRendererTable: Record<string, () => void> = {};
  const catalogView = Zs2Gui.CatalogView.create({
    documentRef: document,
    windowRef: window,
    byId: $,
    escapeHtml,
    renderers: catalogRendererTable,
    iconVersion: () => iconRenderer.version(),
    activateAdjacentToolSection
  });
  const catalogRenderers = Zs2Gui.CatalogRenderers.create({
    catalogs,
    catalogView,
    iconRenderer,
    dom,
    byId: $,
    selectedNumber,
    parseItemSelection,
    itemSelectionKey
  });
  Object.assign(catalogRendererTable, catalogRenderers.renderers);
  const offlineHuntView = Zs2Gui.OfflineHuntView.create({
    dom,
    catalogs,
    itemKindLabels,
    escapeHtml,
    formatNumber
  });

  function renderActiveCatalogs() {
    catalogView.renderActiveCatalogs();
  }

  function renderCatalogs() {
    renderActiveCatalogs();
  }

  function readEvents() {
    return bridgeClient.readEvents();
  }

  function showToast(message, kind = "info") {
    dom.toast.textContent = message;
    dom.toast.className = `toast toast-${kind}`;
    dom.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 2600);
  }

  function setStatus(kind, text) {
    dom.statusPill.className = `status status-${kind}`;
    dom.statusPill.textContent = text;
  }

  function formatNumber(value) {
    return Zs2Gui.Format.formatNumber(value);
  }

  function parseValue(text) {
    const value = String(text).trim();
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    if (value !== "" && Number.isFinite(Number(value))) return Number(value);
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  function escapeHtml(value) {
    return Zs2Gui.Format.escapeHtml(value);
  }

  function numberValue(id, fallback = 0) {
    const value = looseNumber($(id).value);
    return Number.isFinite(value) ? value : fallback;
  }

  function optionalNumber(id) {
    const text = String($(id).value).trim();
    if (text === "") return undefined;
    const value = looseNumber(text);
    return Number.isFinite(value) ? value : undefined;
  }

  function looseNumber(value) {
    return Zs2Gui.Format.looseNumber(value);
  }

  function activeActorId() {
    return numberValue("actorId", 0);
  }

  function skillActorId() {
    return numberValue("skillActorId", activeActorId());
  }

  function updateLookupHints() {
    const itemSelection = parseItemSelection();
    const itemName = catalogName(itemSelection.kind, itemSelection.id);
    const itemKindLabel = itemKindLabels[itemSelection.kind] || itemSelection.kind;
    $("itemHint").textContent = itemName ? `${itemKindLabel} ${itemSelection.id} / ${itemName}` : "";

    const actorId = numberValue("actorId", NaN);
    const actorName = catalogName("actor", actorId);
    $("actorHint").textContent = actorName ? `${actorId} / ${actorName}` : "";

    const skillActorName = catalogName("actor", numberValue("skillActorId", NaN));
    const skillName = catalogName("skill", numberValue("skillId", NaN));
    $("skillHint").textContent = [skillActorName, skillName].filter(Boolean).join(" / ");

    const babyName = babyDisplayName(numberValue("babyActorId", NaN));
    const babySkill = catalogName("skill", numberValue("babySkillId", NaN));
    $("babyHint").textContent = [
      babyName ? `${$("babyActorId").value} / ${babyName}` : "",
      babySkill ? `${$("babySkillId").value} / ${babySkill}` : ""
    ].filter(Boolean).join(" / ");

    const talentActorName = catalogName("actor", numberValue("talentActorId", NaN));
    $("talentState").textContent = talentActorName ? `${$("talentActorId").value} / ${talentActorName}` : $("talentState").textContent;

    const titleName = catalogName("title", numberValue("titleId", NaN));
    $("titleHint").textContent = titleName ? `${$("titleId").value} / ${titleName}` : "";

    const costumeName = catalogName("costume", numberValue("costumeId", NaN));
    $("costumeHint").textContent = costumeName ? `${$("costumeId").value} / ${costumeName}` : "";

    const variableName = catalogName("variable", numberValue("variableId", NaN));
    $("variableHint").textContent = variableName ? `${$("variableId").value} / ${variableName}` : "";

    const switchName = catalogName("switch", numberValue("switchId", NaN));
    $("switchHint").textContent = switchName ? `${$("switchId").value} / ${switchName}` : "";

    const mapName = catalogName("map", numberValue("mapId", NaN));
    $("mapHint").textContent = mapName ? `${$("mapId").value} / ${mapName}` : "";

    const huntMap = catalogEntry("huntMap", numberValue("offlineHuntMapId", NaN));
    $("offlineHuntMapHint").textContent = huntMap
      ? `${$("offlineHuntMapId").value} / ${huntMap.name}${huntMap.hasEncounters ? "" : " / 无随机遇敌，建议切到敌群挂机"}`
      : "";

    const huntTroopName = catalogName("troop", numberValue("offlineHuntTroopId", NaN));
    $("offlineHuntTroopHint").textContent = huntTroopName ? `固定敌群 ${$("offlineHuntTroopId").value} / ${huntTroopName}` : "";

    const battleTroopName = catalogName("troop", numberValue("battleTroopId", NaN));
    $("battleTroopHint").textContent = battleTroopName ? `${$("battleTroopId").value} / ${battleTroopName}` : "";

    const commonEventName = catalogName("commonEvent", numberValue("commonEventId", NaN));
    $("commonEventHint").textContent = commonEventName ? `${$("commonEventId").value} / ${commonEventName}` : "";
  }

  function setupCatalogs() {
    catalogView.populateDatalist("allOptions", catalogs.all);
    catalogView.populateDatalist("itemOptions", catalogs.item);
    catalogView.populateDatalist("weaponOptions", catalogs.weapon);
    catalogView.populateDatalist("armorOptions", catalogs.armor);
    catalogView.populateDatalist("actorOptions", catalogs.actor);
    catalogView.populateDatalist("skillOptions", catalogs.skill);
    babyOptionsSignature = "";
    catalogView.populateDatalist("babyOptions", []);
    catalogView.populateDatalist("titleOptions", catalogs.title);
    catalogView.populateDatalist("costumeOptions", catalogs.costume);
    catalogView.populateDatalist("variableOptions", catalogs.variable);
    catalogView.populateDatalist("switchOptions", catalogs.switch);
    catalogView.populateDatalist("mapOptions", catalogs.map);
    catalogView.populateDatalist("offlineHuntMapOptions", catalogs.huntMap);
    catalogView.populateDatalist("offlineHuntTroopOptions", catalogs.troop);
    catalogView.populateDatalist("commonEventOptions", catalogs.commonEvent);
    $("itemKind").addEventListener("change", () => {
      const kind = $("itemKind").value;
      $("itemId").setAttribute("list", `${kind}Options`);
      if (kind === "all") {
        const selection = parseItemSelection();
        if (Number.isFinite(selection.id)) $("itemId").value = itemSelectionKey(selection);
      } else if (/^(item|weapon|armor)\s*:/i.test($("itemId").value)) {
        $("itemId").value = String(parseItemSelection().id || "");
      }
      catalogView.refreshPickerDatalist($("itemId"));
      updateLookupHints();
      catalogRenderers.renderItemList();
    });
    $("itemSearch").addEventListener("input", debounce(catalogRenderers.renderItemList.bind(catalogRenderers)));
    $("skillSearch").addEventListener("input", debounce(catalogRenderers.renderSkillList.bind(catalogRenderers)));
    $("babySkillSearch").addEventListener("input", debounce(catalogRenderers.renderBabySkillList.bind(catalogRenderers)));
    $("actorSearch").addEventListener("input", debounce(catalogRenderers.renderActorList.bind(catalogRenderers)));
    $("titleSearch").addEventListener("input", debounce(catalogRenderers.renderTitleList.bind(catalogRenderers)));
    $("costumeSearch").addEventListener("input", debounce(catalogRenderers.renderCostumeList.bind(catalogRenderers)));
    $("variableSearch").addEventListener("input", debounce(catalogRenderers.renderVariableList.bind(catalogRenderers)));
    $("switchSearch").addEventListener("input", debounce(catalogRenderers.renderSwitchList.bind(catalogRenderers)));
    $("mapSearch").addEventListener("input", debounce(catalogRenderers.renderMapList.bind(catalogRenderers)));
    $("offlineHuntMapSearch").addEventListener("input", debounce(catalogRenderers.renderOfflineHuntMapList.bind(catalogRenderers)));
    $("offlineHuntTroopSearch").addEventListener("input", debounce(catalogRenderers.renderOfflineHuntTroopList.bind(catalogRenderers)));
    $("commonEventSearch").addEventListener("input", debounce(catalogRenderers.renderCommonEventList.bind(catalogRenderers)));
    $("itemId").addEventListener("input", () => {
      updateLookupHints();
      catalogRenderers.renderItemList();
    });
    $("actorId").addEventListener("input", () => {
      updateLookupHints();
      catalogRenderers.renderActorList();
    });
    $("skillId").addEventListener("input", () => {
      updateLookupHints();
      catalogRenderers.renderSkillList();
    });
    $("babyActorId").addEventListener("input", updateLookupHints);
    $("babyActorId").addEventListener("change", () => {
      updateLookupHints();
      renderBabyList(latestState && latestState.baby);
    });
    ["babySkillId", "babyActionSlot", "babySkillMode", "babyLearnSlots"].forEach((id) => {
      $(id).addEventListener("input", () => {
        updateLookupHints();
        catalogRenderers.renderBabySkillList();
      });
    });
    ["skillActorId"].forEach((id) => {
      $(id).addEventListener("input", updateLookupHints);
    });
    ["talentActorId", "titleId", "costumeId"].forEach((id) => {
      $(id).addEventListener("input", () => {
        updateLookupHints();
        if (id === "titleId") catalogRenderers.renderTitleList();
        else if (id === "costumeId") catalogRenderers.renderCostumeList();
      });
    });
    ["variableId", "switchId", "mapId", "offlineHuntMapId", "offlineHuntTroopId", "battleTroopId", "commonEventId"].forEach((id) => {
      $(id).addEventListener("input", () => {
        updateLookupHints();
        if (id === "variableId") catalogRenderers.renderVariableList();
        else if (id === "switchId") catalogRenderers.renderSwitchList();
        else if (id === "mapId") catalogRenderers.renderMapList();
        else if (id === "offlineHuntMapId") catalogRenderers.renderOfflineHuntMapList();
        else if (id === "offlineHuntTroopId") catalogRenderers.renderOfflineHuntTroopList();
        else if (id === "commonEventId") catalogRenderers.renderCommonEventList();
      });
    });
    updateLookupHints();
    setupPickerInputs();
  }

  function setupPickerInputs() {
    document.querySelectorAll<HTMLInputElement>("input[list]").forEach((input) => {
      input.setAttribute("autocomplete", "off");
      input.dataset.pickerLastValue = input.value || "";
      input.addEventListener("focus", () => {
        const value = String(input.value || "");
        catalogView.refreshPickerDatalist(input);
        if (!value.trim()) return;
        input.dataset.pickerLastValue = value;
        input.dataset.pickerCleared = "true";
        input.value = "";
        catalogView.refreshPickerDatalist(input);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dataset.pickerLastValue = value;
        input.dataset.pickerCleared = "true";
      });
      input.addEventListener("input", () => {
        catalogView.refreshPickerDatalist(input);
        input.dataset.pickerCleared = "false";
        input.dataset.pickerLastValue = input.value || "";
      });
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || input.dataset.pickerCleared !== "true") return;
        input.value = input.dataset.pickerLastValue || input.defaultValue || "";
        input.dataset.pickerCleared = "false";
        catalogView.refreshPickerDatalist(input);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.blur();
      });
      input.addEventListener("blur", () => {
        if (input.dataset.pickerCleared === "true" && !String(input.value || "").trim()) {
          input.value = input.dataset.pickerLastValue || input.defaultValue || "";
          catalogView.refreshPickerDatalist(input);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        input.dataset.pickerCleared = "false";
        input.dataset.pickerLastValue = input.value || "";
      });
    });
  }

  function bindVirtualScroll(target) {
    target.tabIndex = 0;
    target.addEventListener("wheel", (event) => {
      const delta = Number(event.deltaY || 0);
      if (!delta || target.scrollHeight <= target.clientHeight + 1) return;
      const atTop = target.scrollTop <= 0;
      const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
      if (!((delta < 0 && atTop) || (delta > 0 && atBottom))) return;
      const scroller = document.body.classList.contains("page-scroll-mode")
        ? document.scrollingElement
        : document.querySelector<HTMLElement>(".tool-grid");
      if (!scroller || scroller === target) return;
      scroller.scrollBy({ top: delta, behavior: "auto" });
      event.preventDefault();
    }, { passive: false });
  }

  function sectionsForTab(tab) {
    const seen = new Set();
    const sections = [];
    Array.from(document.querySelectorAll<HTMLElement>(`[data-tool-panel="${tab}"]`)).forEach((panel) => {
      if (panel.dataset.toolSectionNav === "false") return;
      String(panel.dataset.toolSection || "").split(/\s+/).filter(Boolean).forEach((section) => {
        if (seen.has(section)) return;
        seen.add(section);
        sections.push({
          section,
          label: panel.dataset.toolLabel || panel.querySelector(".panel-title")?.textContent?.trim() || section
        });
      });
    });
    return sections;
  }

  function ensureActiveToolSection(tab) {
    const sections = sectionsForTab(tab);
    if (!sections.length) return "";
    if (!sections.some((item) => item.section === activeToolSections[tab])) {
      activeToolSections[tab] = sections[0].section;
    }
    return activeToolSections[tab];
  }

  function updateToolSectionNav(tab) {
    const sections = sectionsForTab(tab);
    const active = ensureActiveToolSection(tab);
    dom.toolSectionNav.hidden = sections.length <= 1;
    dom.toolSectionNav.innerHTML = sections.map((item) =>
      `<button type="button" class="${item.section === active ? "active" : ""}"${item.section === active ? ' aria-current="true"' : ""} data-tool-section-jump="${escapeHtml(item.section)}">${escapeHtml(item.label)}</button>`
    ).join("");
    requestAnimationFrame(syncStickyNavMetrics);
  }

  function panelMatchesActiveSection(panel) {
    if (panel.dataset.toolPanel !== activeToolTab) return false;
    const section = ensureActiveToolSection(activeToolTab);
    const panelSections = String(panel.dataset.toolSection || "").split(/\s+/).filter(Boolean);
    if (panelSections.length && !panelSections.includes(section)) return false;
    const modePanel = panel.dataset.offlineModePanel;
    if (modePanel && modePanel !== offlineHuntMode) return false;
    return true;
  }

  function updateVisiblePanels() {
    ensureActiveToolSection(activeToolTab);
    document.querySelectorAll<HTMLElement>("[data-tool-panel]").forEach((panel) => {
      panel.hidden = !panelMatchesActiveSection(panel);
    });
    updateToolSectionNav(activeToolTab);
  }

  function activateToolSection(section, options: any = {}) {
    const sections = sectionsForTab(activeToolTab);
    if (!sections.some((item) => item.section === section)) return;
    activeToolSections[activeToolTab] = section;
    if (activeToolTab === "offline" && section === "map" && offlineHuntMode !== "map") {
      setOfflineHuntMode("map", { keepSection: true, deferRender: true });
    } else if (activeToolTab === "offline" && section === "troop" && offlineHuntMode !== "troop") {
      setOfflineHuntMode("troop", { keepSection: true, deferRender: true });
    } else {
      updateVisiblePanels();
    }
    if (!options.keepScroll) scrollActiveToolAreaToTop({ target: "section" });
    requestAnimationFrame(renderActiveCatalogs);
  }

  function activateAdjacentToolSection(direction = 1) {
    const sections = sectionsForTab(activeToolTab);
    if (!sections.length) return;
    const active = ensureActiveToolSection(activeToolTab);
    const index = Math.max(0, sections.findIndex((item) => item.section === active));
    const next = sections[(index + direction + sections.length) % sections.length];
    if (next) activateToolSection(next.section);
  }

  function updateViewportMode() {
    const scale = viewportScale();
    const zoomed = scale >= 1.2;
    const pageScrollMode = window.innerWidth <= 980
      || window.innerHeight <= 760
      || (zoomed && (window.innerWidth <= 1280 || window.innerHeight <= 900));
    document.body.classList.toggle("zoom-scroll-mode", zoomed);
    document.body.classList.toggle("page-scroll-mode", pageScrollMode);
    return pageScrollMode;
  }

  function cssPixelVar(name, fallback = 0) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name);
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function syncStickyNavMetrics() {
    const topbar = document.querySelector<HTMLElement>(".topbar");
    const toolNav = document.querySelector<HTMLElement>(".tool-nav");
    const sectionNav = dom.toolSectionNav;
    const topbarHeight = topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 0;
    const toolNavHeight = toolNav ? Math.ceil(toolNav.getBoundingClientRect().height) : 0;
    const sectionNavHeight = sectionNav && !sectionNav.hidden ? Math.ceil(sectionNav.getBoundingClientRect().height) : 0;
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--topbar-sticky-offset", `${topbarHeight}px`);
    rootStyle.setProperty("--tool-nav-sticky-height", `${toolNavHeight}px`);
    rootStyle.setProperty("--section-nav-sticky-height", `${sectionNavHeight}px`);
  }

  function rerenderAfterViewportChange() {
    updateViewportMode();
    syncStickyNavMetrics();
    renderCatalogs();
  }

  function bindViewportResize() {
    const handleResize = debounce(() => requestAnimationFrame(rerenderAfterViewportChange), 80);
    window.addEventListener("resize", handleResize);
    const visualViewport = (window as any).visualViewport;
    if (visualViewport) visualViewport.addEventListener("resize", handleResize);
    updateViewportMode();
    requestAnimationFrame(syncStickyNavMetrics);
  }

  function pageScrollContainer() {
    const candidates = [
      document.scrollingElement as HTMLElement,
      document.documentElement,
      document.body
    ].filter(Boolean);
    return candidates.find((element) => {
      const style = getComputedStyle(element);
      return element.scrollHeight > element.clientHeight + 1 && style.overflowY !== "hidden";
    }) || document.scrollingElement as HTMLElement || document.body;
  }

  function scrollPageTargetBelowSticky(target, targetKind) {
    if (!target) return;
    syncStickyNavMetrics();
    const scroller = pageScrollContainer();
    const scrollerRect = scroller === document.body || scroller === document.documentElement
      ? { top: 0 }
      : scroller.getBoundingClientRect();
    const topbarHeight = cssPixelVar("--topbar-sticky-offset", 0);
    const toolNavHeight = cssPixelVar("--tool-nav-sticky-height", 0);
    const gap = cssPixelVar("--chrome-gap", 10);
    const offset = topbarHeight + (targetKind === "section" ? toolNavHeight + gap : gap);
    const top = scroller.scrollTop + target.getBoundingClientRect().top - scrollerRect.top - offset;
    scroller.scrollTo({ top: Math.max(0, Math.floor(top)), behavior: "auto" });
  }

  function scrollActiveToolAreaToTop(options: any = {}) {
    const grid = document.querySelector<HTMLElement>(".tool-grid");
    if (grid) grid.scrollTop = 0;
    if (!document.body.classList.contains("page-scroll-mode")) return;
    const toolNav = document.querySelector<HTMLElement>(".tool-nav");
    const sectionNav = dom.toolSectionNav && !dom.toolSectionNav.hidden ? dom.toolSectionNav : null;
    const workspace = document.querySelector<HTMLElement>(".workspace");
    const targetKind = options.target === "section" && sectionNav ? "section" : "primary";
    const target = targetKind === "section" ? sectionNav : toolNav || workspace;
    scrollPageTargetBelowSticky(target, targetKind);
  }

  function sendCommand(command) {
    const payload = bridgeClient.appendCommand(command);
    showToast(`已发送：${payload.type}`, "success");
    return payload;
  }

  function launchGame() {
    if (!fs.existsSync(trainerGameExe)) {
      showToast("找不到 Game.exe", "error");
      return;
    }
    if (!fs.existsSync(path.join(bridgeExtensionDir, "manifest.json"))) {
      showToast("找不到 bridge extension", "error");
      return;
    }
    try {
      gameProcess = childProcess.spawn(trainerGameExe, [`--load-extension=${bridgeExtensionDir}`], {
        cwd: rootDir,
        env: {
          ...process.env,
          ZS2_MODKIT_ROOT: projectRoot,
          ZS2_GAME_ROOT: rootDir
        },
        detached: true,
        stdio: "ignore"
      });
      gameProcess.unref();
      showToast(`游戏已启动 PID ${gameProcess.pid}`, "success");
    } catch (error) {
      showToast(`启动失败：${error.message}`, "error");
    }
  }

  function openFolder(folder) {
    try {
      fs.mkdirSync(folder, { recursive: true });
      nw.Shell.openItem(folder);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function copyDirectory(source, target) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      const src = path.join(source, entry.name);
      const dst = path.join(target, entry.name);
      if (entry.isDirectory()) copyDirectory(src, dst);
      else fs.copyFileSync(src, dst);
    }
  }

  function backupSaves() {
    if (!fs.existsSync(saveDir)) {
      showToast("没有找到存档目录", "error");
      return;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = path.join(projectRoot, "output", "backup", "save", stamp);
    copyDirectory(saveDir, target);
    showToast("存档已备份", "success");
    openFolder(target);
  }

  function clearEvents() {
    bridgeClient.clearEvents();
    lastEventSize = 0;
    renderEvents([]);
    showToast("事件已清空", "warning");
  }

  function sendOptions(options) {
    sendCommand({ type: "trainer.options.set", options });
  }

  function setOfflineHuntMode(mode, options: any = {}) {
    offlineHuntMode = mode === "troop" ? "troop" : "map";
    if (activeToolTab === "offline" && !options.keepSection) activeToolSections.offline = offlineHuntMode;
    if (activeToolTab === "offline" && activeToolSections.offline !== offlineHuntMode) activeToolSections.offline = offlineHuntMode;
    document.querySelectorAll<HTMLElement>("[data-offline-mode-panel]").forEach((panel) => {
      if (panel.dataset.toolPanel) return;
      panel.hidden = panel.dataset.offlineModePanel !== offlineHuntMode;
    });
    $("offlineHuntClearTroopBtn").hidden = offlineHuntMode !== "troop";
    updateLookupHints();
    updateVisiblePanels();
    if (!options.deferRender) requestAnimationFrame(renderActiveCatalogs);
  }

  function selectItem(kind, id, keepChooser = false) {
    selectedItemKind = kind;
    if (!keepChooser) $("itemKind").value = kind;
    const chooserKind = $("itemKind").value;
    $("itemId").setAttribute("list", `${chooserKind}Options`);
    $("itemId").value = chooserKind === "all" ? `${kind}:${id}` : String(id);
    updateLookupHints();
    catalogRenderers.renderItemList();
  }

  function selectActor(id) {
    $("actorId").value = String(id);
    $("skillActorId").value = String(id);
    updateLookupHints();
    catalogRenderers.renderActorList();
  }

  function selectSkill(id) {
    $("skillId").value = String(id);
    updateLookupHints();
    catalogRenderers.renderSkillList();
  }

  function selectBabySkill(id) {
    $("babySkillId").value = String(id);
    updateLookupHints();
    catalogRenderers.renderBabySkillList();
  }

  function selectBaby(id) {
    $("babyActorId").value = String(id);
    updateLookupHints();
    renderBabyList(latestState && latestState.baby);
  }

  function selectTitle(id) {
    $("titleId").value = String(id);
    updateLookupHints();
    catalogRenderers.renderTitleList();
  }

  function selectCostume(id) {
    $("costumeId").value = String(id);
    updateLookupHints();
    catalogRenderers.renderCostumeList();
  }

  function selectVariable(id) {
    $("variableId").value = String(id);
    updateLookupHints();
    catalogRenderers.renderVariableList();
  }

  function selectSwitch(id, value = switchValue) {
    $("switchId").value = String(id);
    if (value !== undefined) {
      switchValue = !!value;
      $("switchOnBtn").classList.toggle("active", switchValue);
      $("switchOffBtn").classList.toggle("active", !switchValue);
    }
    updateLookupHints();
    catalogRenderers.renderSwitchList();
  }

  function selectMap(id) {
    $("mapId").value = String(id);
    updateLookupHints();
    catalogRenderers.renderMapList();
  }

  function selectOfflineHuntMap(id) {
    setOfflineHuntMode("map");
    $("offlineHuntMapId").value = String(id);
    $("offlineHuntTroopId").value = "";
    updateLookupHints();
    catalogRenderers.renderOfflineHuntMapList();
    catalogRenderers.renderOfflineHuntTroopList();
  }

  function selectOfflineHuntTroop(id) {
    setOfflineHuntMode("troop");
    $("offlineHuntTroopId").value = String(id);
    updateLookupHints();
    catalogRenderers.renderOfflineHuntTroopList();
  }

  function selectBattleTroop(id) {
    $("battleTroopId").value = String(id);
    updateLookupHints();
  }

  function selectCommonEvent(id) {
    $("commonEventId").value = String(id);
    updateLookupHints();
    catalogRenderers.renderCommonEventList();
  }

  function addItem(kind, id) {
    selectItem(kind, id, $("itemKind").value === "all");
    sendCommand({
      type: "item.add",
      kind,
      id: Number(id),
      amount: numberValue("itemAmount", 1)
    });
  }

  function unlockActor(id) {
    selectActor(id);
    sendCommand({ type: "actor.unlock", id: Number(id) });
  }

  function learnSkill(id) {
    selectSkill(id);
    sendCommand({ type: "actor.skill.learn", id: skillActorId(), skillId: Number(id) });
  }

  function forgetSkill(id) {
    selectSkill(id);
    sendCommand({ type: "actor.skill.forget", id: skillActorId(), skillId: Number(id) });
  }

  function learnBabySkill(id) {
    selectBabySkill(id);
    sendCommand(babyCommandBase("baby.skill.learn"));
  }

  function forgetBabySkill(id) {
    selectBabySkill(id);
    sendCommand(babyCommandBase("baby.skill.forget"));
  }

  function babyRows(baby = latestState && latestState.baby) {
    return Array.isArray(baby && baby.babies) ? baby.babies : [];
  }

  function babyDisplayName(id) {
    const rows = babyRows();
    const row = rows.find((item) => Number(item.id) === Number(id));
    return row ? row.name || "" : "";
  }

  function babyOptionEntries(rows = babyRows()) {
    return rows.map((row) => ({
      id: row.id,
      name: `${row.name || "宝宝"} Lv.${row.level ?? "-"} / 点数${babyLearnSlotsOf(row)} / 主动${row.actionCount || 0} 被动${row.passiveCount || 0}`
    }));
  }

  function babyLearnSlotsOf(row) {
    if (!row) return 0;
    if (row.learnSlots && row.learnSlots.slots != null) return Number(row.learnSlots.slots || 0);
    const raw = Number(row.BBLeranCount || 0);
    return raw > 0 ? Math.max(0, Math.round(raw / 1.0012)) : 0;
  }

  function updateBabyOptions(baby) {
    const rows = babyRows(baby);
    const signature = rows.map((row) => [
      row.id,
      row.name || "",
      row.level ?? "",
      babyLearnSlotsOf(row),
      row.actionCount || 0,
      row.passiveCount || 0,
      (row.actionSkills || []).map((skill: any) => skill.id).join(","),
      (row.passiveSkills || []).map((skill: any) => skill.id).join(",")
    ].join(":")).join("|");
    if (signature === babyOptionsSignature) return;
    babyOptionsSignature = signature;
    catalogView.populateDatalist("babyOptions", babyOptionEntries(rows));
  }

  function skillChipList(skills, emptyText) {
    if (!Array.isArray(skills) || !skills.length) return `<span>${escapeHtml(emptyText)}</span>`;
    return skills.map((skill) =>
      `<span class="result-chip">${escapeHtml(skill.id)} ${escapeHtml(skill.name || "")}</span>`
    ).join("");
  }

  function renderBabyList(baby) {
    const rows = babyRows(baby);
    updateBabyOptions(baby);
    dom.babyMetric.textContent = rows.length ? `${formatNumber(rows.length)} 个` : "0";
    if (!rows.length) {
      dom.babyState.textContent = "等待运行时读取宝宝数据";
      dom.babyList.innerHTML = '<div class="baby-empty">未检测到已生成宝宝；进存档后点“刷新宝宝”。</div>';
      return;
    }
    const selectedId = numberValue("babyActorId", rows[0].id);
    const selected = rows.find((row) => Number(row.id) === Number(selectedId)) || rows[0];
    const learnSlots = babyLearnSlotsOf(selected);
    const learnSlotsInput = $("babyLearnSlots");
    if (document.activeElement !== learnSlotsInput) learnSlotsInput.value = String(learnSlots);
    dom.babyState.textContent = [
      `${selected.id} / ${selected.name || "宝宝"}`,
      `Lv.${selected.level ?? "-"}`,
      `学习点数 ${learnSlots}`,
      `主动 ${selected.actionCount || 0}`,
      `被动 ${selected.passiveCount || 0}`,
      `原值 ${selected.BBLeranCount ?? "-"}`
    ].join(" / ");
    dom.babyList.innerHTML = rows.map((row) => {
      const active = Number(row.id) === Number(selectedId) ? " active" : "";
      return `
        <div class="baby-row${active}" data-baby-id="${escapeHtml(row.id)}">
          <div class="catalog-badge">BB</div>
          <div class="baby-main">
            <strong>${escapeHtml(row.id)} / ${escapeHtml(row.name || "宝宝")}</strong>
            <span>Lv.${escapeHtml(row.level ?? "-")} / ${escapeHtml(row.nickname || "")} / 学习点数 ${escapeHtml(babyLearnSlotsOf(row))} / 原值 ${escapeHtml(row.BBLeranCount ?? "-")}</span>
            <div class="baby-skills"><b>主动</b>${skillChipList(row.actionSkills, "无")}</div>
            <div class="baby-skills"><b>被动</b>${skillChipList(row.passiveSkills, "无")}</div>
          </div>
          <div class="catalog-actions">
            <button data-baby-select="${escapeHtml(row.id)}">选择</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function babyCommandBase(type) {
    const command: any = {
      type,
      skillId: numberValue("babySkillId", 0),
      mode: $("babySkillMode").value
    };
    const id = optionalNumber("babyActorId");
    const slot = optionalNumber("babyActionSlot");
    if (id !== undefined) command.id = id;
    if (slot !== undefined) command.slot = slot;
    return command;
  }

  function babySlotsCommand(type, amount) {
    const command: any = { type };
    const id = optionalNumber("babyActorId");
    if (id !== undefined) command.id = id;
    if (type.endsWith(".add")) command.amount = amount;
    else command.value = numberValue("babyLearnSlots", 0);
    return command;
  }

  function talentCommandBase(type, party = false) {
    const command: any = {
      type,
      mode: $("talentPointMode").value,
      cspId: optionalNumber("talentCspId")
    };
    if (party) command.party = true;
    else command.id = numberValue("talentActorId", 1);
    if (type.endsWith(".add")) command.amount = numberValue("talentPointValue", 0);
    else if (type.endsWith(".set")) command.value = numberValue("talentPointValue", 0);
    return command;
  }

  function unlockTitle(id) {
    selectTitle(id);
    sendCommand({ type: "title.unlock", id: Number(id) });
  }

  function unlockCostume(id) {
    selectCostume(id);
    sendCommand({ type: "costume.unlock", id: Number(id) });
  }

  function setVariable(id) {
    selectVariable(id);
    sendCommand({ type: "variable.set", id: Number(id), value: parseValue($("variableValue").value) });
  }

  function setSwitch(id, value) {
    selectSwitch(id, value);
    sendCommand({ type: "switch.set", id: Number(id), value: !!value });
  }

  function transferMap(id) {
    selectMap(id);
    sendCommand({
      type: "map.transfer",
      mapId: Number(id),
      x: numberValue("mapX", 10),
      y: numberValue("mapY", 10),
      direction: numberValue("mapDirection", 2),
      fade: numberValue("mapFade", 0)
    });
  }

  function offlineHuntCommandBase(type) {
    const isTroopMode = offlineHuntMode === "troop";
    const troopId = isTroopMode ? optionalNumber("offlineHuntTroopId") : undefined;
    if (isTroopMode && !Number.isFinite(Number(troopId))) {
      showToast("先选择敌群", "warning");
      return null;
    }
    if (!isTroopMode && type === "offlineHunt.run") {
      const map = catalogEntry("huntMap", numberValue("offlineHuntMapId", 31));
      if (map && !map.hasEncounters) {
        showToast("这张地图没有随机遇敌，不能按地图挂机；请切到敌群挂机", "warning");
        return null;
      }
    }
    return {
      type,
      mode: isTroopMode ? "troop" : "map",
      mapId: isTroopMode ? undefined : numberValue("offlineHuntMapId", 31),
      times: isTroopMode ? numberValue("offlineHuntTroopTimes", 10) : numberValue("offlineHuntMapTimes", 10),
      regionId: isTroopMode ? undefined : optionalNumber("offlineHuntRegionId"),
      troopId,
      enemyBook: !!$("offlineHuntEnemyBook").checked,
      recover: !!$("offlineHuntRecover").checked,
      save: !!$("offlineHuntSave").checked,
      saveSlot: numberValue("offlineHuntSaveSlot", 1),
      autoSellQualities: selectedOfflineQualities([
        ["offlineAutoSellGray", 0],
        ["offlineAutoSellWhite", 1],
        ["offlineAutoSellGreen", 2],
        ["offlineAutoSellBlue", 3],
        ["offlineAutoSellPurple", 4]
      ]),
      blockDropQualities: selectedOfflineQualities([
        ["offlineBlockWhite", 1],
        ["offlineBlockGreen", 2],
        ["offlineBlockBlue", 3]
      ])
    };
  }

  function selectedOfflineQualities(rows) {
    return rows
      .filter(([id]) => !!$(id).checked)
      .map(([, quality]) => quality);
  }

  function previewOfflineHunt() {
    const command = offlineHuntCommandBase("offlineHunt.preview");
    if (command) sendCommand(command);
  }

  function runOfflineHunt() {
    const command = offlineHuntCommandBase("offlineHunt.run");
    if (command) sendCommand(command);
  }

  function startBattle(id?: number) {
    if (id !== undefined) selectBattleTroop(id);
    const troopId = optionalNumber("battleTroopId");
    const command: any = { type: "battle.start", canEscape: true, canLose: true };
    if (troopId !== undefined && troopId > 0) command.troopId = troopId;
    else command.variableId = 399;
    sendCommand(command);
  }

  function runCommonEvent(id) {
    selectCommonEvent(id);
    sendCommand({ type: "commonEvent.run", id: Number(id) });
  }

  function handleCatalogClick(event) {
    const actionButton = event.target.closest("[data-catalog-action]");
    const row = event.target.closest(".catalog-row");
    if (!row) return;
    const id = Number(row.dataset.id);
    const kind = row.dataset.kind;

    if (!actionButton) {
      if (kind === "item" || kind === "weapon" || kind === "armor") selectItem(kind, id, $("itemKind").value === "all");
      else if (kind === "skill") selectSkill(id);
      else if (kind === "babySkill") selectBabySkill(id);
      else if (kind === "actor") selectActor(id);
      else if (kind === "title") selectTitle(id);
      else if (kind === "costume") selectCostume(id);
      else if (kind === "variable") selectVariable(id);
      else if (kind === "switch") selectSwitch(id);
      else if (kind === "map") selectMap(id);
      else if (kind === "huntMap") selectOfflineHuntMap(id);
      else if (kind === "huntTroop") selectOfflineHuntTroop(id);
      else if (kind === "commonEvent") selectCommonEvent(id);
      return;
    }

    const action = actionButton.dataset.catalogAction;
    if (action === "item-add") addItem(kind, id);
    else if (action === "skill-learn") learnSkill(id);
    else if (action === "skill-forget") forgetSkill(id);
    else if (action === "baby-skill-learn") learnBabySkill(id);
    else if (action === "baby-skill-forget") forgetBabySkill(id);
    else if (action === "actor-unlock") unlockActor(id);
    else if (action === "actor-select") selectActor(id);
    else if (action === "title-unlock") unlockTitle(id);
    else if (action === "costume-unlock") unlockCostume(id);
    else if (action === "variable-select") selectVariable(id);
    else if (action === "variable-set") setVariable(id);
    else if (action === "switch-on") setSwitch(id, true);
    else if (action === "switch-off") setSwitch(id, false);
    else if (action === "map-transfer") transferMap(id);
    else if (action === "offline-hunt-select") selectOfflineHuntMap(id);
    else if (action === "offline-troop-select") selectOfflineHuntTroop(id);
    else if (action === "offline-troop-run") {
      selectOfflineHuntTroop(id);
      runOfflineHunt();
    }
    else if (action === "battle-start") startBattle(id);
    else if (action === "common-event-run") runCommonEvent(id);
  }

  function renderState(state) {
    latestState = state;
    if (!state) {
      setStatus("idle", "未连接");
      dom.bridgeState.textContent = "等待 bridge";
      dom.partyState.textContent = "-";
      dom.goldState.textContent = "-";
      dom.goldMetric.textContent = "0";
      dom.saveState.textContent = "-";
      dom.mapState.textContent = "-";
      dom.saveFiles.innerHTML = "";
      dom.partyMembers.innerHTML = "";
      dom.babySkillListCount.textContent = "";
      dom.babySkillList.innerHTML = "";
      dom.babyMetric.textContent = "0";
      dom.babyHint.textContent = "";
      dom.babyState.textContent = "";
      dom.babyList.innerHTML = "";
      $("babyLearnSlots").value = "";
      updateBabyOptions(null);
      dom.talentPointMetric.textContent = "0";
      dom.talentState.textContent = "";
      $("titleHint").textContent = "";
      $("costumeHint").textContent = "";
      dom.battleState.textContent = "";
      $("battleTroopHint").textContent = "";
      $("mapThroughBtn").classList.remove("active");
      $("mapThroughBtn").textContent = "穿墙";
      dom.offlineHuntMetric.textContent = "0";
      dom.offlineHuntState.textContent = "";
      dom.offlineHuntResult.innerHTML = "";
      $("offlineHuntPreviewBtn").disabled = true;
      $("offlineHuntRunBtn").disabled = true;
      $("offlineHuntPreviewTroopBtn").disabled = true;
      $("offlineHuntRunTroopBtn").disabled = true;
      return;
    }

    const age = Date.now() - Number(state.ts || 0);
    const fresh = age >= 0 && age < 5000;
    const version = state.bridgeVersion || "?";
    const versionOk = version === EXPECTED_BRIDGE_VERSION;
    if (!fresh) setStatus("idle", "离线");
    else if (!versionOk) setStatus("error", "桥接版本不一致");
    else if (state.lastError) setStatus("error", "有错误");
    else if (state.hasParty) setStatus("online", "已连接");
    else setStatus("idle", "加载中");

    dom.bridgeState.textContent = fresh
      ? `${state.storagePatched ? "已接入" : "已注入"} v${version}${versionOk ? "" : `，实际 ${version}，期望 ${EXPECTED_BRIDGE_VERSION}`}`
      : "上次状态";
    dom.partyState.textContent = state.hasParty ? "可用" : "未就绪";
    dom.goldState.textContent = formatNumber(state.gold);
    dom.goldMetric.textContent = formatNumber(state.gold || 0);
    dom.saveState.textContent = state.saveDirExists ? "已识别" : "缺失";
    const currentMap = state.currentMap || {};
    dom.mapState.textContent = currentMap.mapId
      ? `${currentMap.mapId} (${currentMap.x ?? "-"}, ${currentMap.y ?? "-"})`
      : "-";
    $("mapThroughBtn").classList.toggle("active", !!currentMap.through);
    $("mapThroughBtn").textContent = currentMap.through ? "穿墙ON" : "穿墙OFF";

    const files = Array.isArray(state.saveFiles) ? state.saveFiles : [];
    dom.saveFiles.innerHTML = files.length
      ? files.map((name) => `<li>${escapeHtml(name)}</li>`).join("")
      : "<li>未检测到</li>";

    const members = Array.isArray(state.partyMembers) ? state.partyMembers : [];
    dom.partyMembers.innerHTML = members.length
      ? members.map((actor) => {
        const vitals = `Lv.${actor.level || "-"} HP ${actor.hp ?? "-"}/${actor.mhp ?? "-"} MP ${actor.mp ?? "-"}/${actor.mmp ?? "-"}`;
        return `<li><strong>${escapeHtml(actor.id)} / ${escapeHtml(actor.name || "")}</strong><span>${escapeHtml(vitals)}</span></li>`;
      }).join("")
      : "<li>未检测到</li>";

    const options = fresh ? (state.trainerOptions || {}) : {};
    if (fresh) updateOptionInputs(options);
    updateBattleButtons(options, fresh && state.hooksPatched, fresh ? state.rateStats : null, fresh ? state.battleStats : null);
    renderBabyList(fresh ? state.baby : null);
    updateProgressPanel(fresh ? state.progress : null);
    offlineHuntView.update(fresh ? state.offlineHunt : null, offlineHuntMode);
    $("offlineHuntPreviewBtn").disabled = !fresh;
    $("offlineHuntRunBtn").disabled = !(fresh && state.hasParty);
    $("offlineHuntPreviewTroopBtn").disabled = !fresh;
    $("offlineHuntRunTroopBtn").disabled = !(fresh && state.hasParty);
  }

  function updateOptionInputs(options) {
    [["expRate", options.expRate], ["goldRate", options.goldRate], ["dropRate", options.dropRate]].forEach(([id, value]) => {
      const input = $(id);
      if (document.activeElement !== input && value != null) input.value = value;
    });
  }

  function updateBattleButtons(options, hooksPatched, rateStats, battleStats) {
    $("noCostBtn").classList.toggle("active", !!options.noSkillCost);
    $("oneHitKillBtn").classList.toggle("active", !!options.oneHitKill);
    $("invincibleBtn").classList.toggle("active", !!options.invincible);
    const noCost = options.noSkillCost ? "无耗ON" : "无耗OFF";
    const oneHit = options.oneHitKill ? "秒杀ON" : "秒杀OFF";
    const invincible = options.invincible ? "无敌ON" : "无敌OFF";
    const last = rateStats && rateStats.last
      ? `倍率命中 ${rateStats.last.name}`
      : "倍率未命中";
    const battle = battleStats && battleStats.last
      ? `战斗命中 ${battleStats.last.name}`
      : "战斗未命中";
    dom.battleState.textContent = `${noCost} / ${oneHit} / ${invincible} / hooks ${hooksPatched ? "OK" : "--"} / ${last} / ${battle}`;
  }

  function updateProgressPanel(progress) {
    const talents = Array.isArray(progress && progress.partyTalent) ? progress.partyTalent : [];
    const actorId = numberValue("talentActorId", NaN);
    const selected = talents.find((actor) => actor.id === actorId) || talents[0];
    dom.talentPointMetric.textContent = formatNumber(selected && selected.sp || 0);
    const talentRows = talents.slice(0, 8).map((actor) => {
      const csp = actor.csp && Object.keys(actor.csp).length
        ? Object.keys(actor.csp).map((key) => `${key}:${actor.csp[key]}`).join(",")
        : "-";
      return `${actor.id}/${actor.name || ""} SP ${formatNumber(actor.sp)} CSP ${csp}`;
    });
    dom.talentState.textContent = talentRows.length ? talentRows.join(" / ") : "等待运行时状态";
    $("titleHint").textContent = progress
      ? `已解锁 ${formatNumber(progress.titleCount)} / ${formatNumber(progress.titleTotal || catalogs.title.length)}`
      : catalogName("title", numberValue("titleId", NaN)) || "";
    $("costumeHint").textContent = progress
      ? `已解锁 ${formatNumber(progress.costumeCount)} / ${formatNumber(progress.costumeTotal || catalogs.costume.length)}`
      : catalogName("costume", numberValue("costumeId", NaN)) || "";
  }

  function renderEvents(events) {
    const latest = events.slice(-40).reverse();
    if (latest.length === 0) {
      dom.eventList.innerHTML = '<div class="event"><div class="event-time">--:--</div><div class="event-body">暂无事件</div></div>';
      return;
    }
    dom.eventList.innerHTML = latest.map((event) => {
      const time = new Date(event.ts || Date.now()).toLocaleTimeString("zh-CN", { hour12: false });
      const ok = event.ok !== false;
      const payload = event.payload ? JSON.stringify(event.payload) : "";
      return `<div class="event ${ok ? "" : "fail"}"><div class="event-time">${escapeHtml(time)}</div><div class="event-body">${escapeHtml(event.type || "event")} ${ok ? "OK" : "FAIL"} ${escapeHtml(payload)}</div></div>`;
    }).join("");
  }

  function refresh() {
    const state = bridgeClient.readState();
    renderState(state);

    try {
      const size = bridgeClient.eventSize();
      if (size !== lastEventSize) {
        lastEventSize = size;
        renderEvents(readEvents());
      }
    } catch {
      renderEvents([]);
    }
  }

  function activateTab(tab) {
    activeToolTab = tab || "core";
    document.querySelectorAll<HTMLElement>("[data-tool-tab]").forEach((button) => {
      const active = button.dataset.toolTab === activeToolTab;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    ensureActiveToolSection(activeToolTab);
    if (activeToolTab === "offline") {
      const sectionMode = activeToolSections.offline === "troop" ? "troop" : "map";
      setOfflineHuntMode(sectionMode, { keepSection: true, deferRender: true });
    }
    else updateVisiblePanels();
    requestAnimationFrame(() => {
      syncStickyNavMetrics();
      scrollActiveToolAreaToTop({ target: "primary" });
      renderActiveCatalogs();
    });
  }

  function recordCurrentPosition() {
    const map = latestState && latestState.currentMap;
    if (!map || !map.mapId) {
      showToast("还没有读取到当前位置", "warning");
      return;
    }
    recordedPosition = {
      mapId: Number(map.mapId),
      x: Number(map.x || 0),
      y: Number(map.y || 0),
      direction: Number(map.direction || 2),
      fade: 0
    };
    $("recordedPosition").textContent = `${recordedPosition.mapId} (${recordedPosition.x}, ${recordedPosition.y})`;
    showToast("已记录当前位置", "success");
  }

  function returnRecordedPosition() {
    if (!recordedPosition) {
      showToast("还没有记录位置", "warning");
      return;
    }
    $("mapId").value = String(recordedPosition.mapId);
    $("mapX").value = String(recordedPosition.x);
    $("mapY").value = String(recordedPosition.y);
    $("mapDirection").value = String(recordedPosition.direction);
    $("mapFade").value = String(recordedPosition.fade);
    updateLookupHints();
    transferMap(recordedPosition.mapId);
  }

  iconRenderer.setupIconSet();
  setupCatalogs();
  Zs2Gui.Bindings.bind({
    documentRef: document,
    byId: $,
    dom,
    bridgeDir,
    saveDir,
    catalogView,
    catalogRenderers,
    activateTab,
    activateToolSection,
    launchGame,
    refresh,
    handleCatalogClick,
    selectBaby,
    bindVirtualScroll,
    bindViewportResize,
    sendCommand,
    sendOptions,
    setVariable,
    setSwitch,
    getSwitchValue: () => switchValue,
    setSwitchValue: (value) => { switchValue = value; },
    parseItemSelection,
    numberValue,
    optionalNumber,
    activeActorId,
    unlockActor,
    skillActorId,
    babyCommandBase,
    babySlotsCommand,
    talentCommandBase,
    unlockTitle,
    unlockCostume,
    startBattle,
    previewOfflineHunt,
    runOfflineHunt,
    setOfflineHuntMode,
    getOfflineHuntMode: () => offlineHuntMode,
    updateLookupHints,
    transferMap,
    recordCurrentPosition,
    returnRecordedPosition,
    runCommonEvent,
    openFolder,
    backupSaves,
    clearEvents,
    showToast
  });
  activateTab("core");
  setOfflineHuntMode("map");
  refresh();
  setInterval(refresh, 700);
})();
