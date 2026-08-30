namespace Zs2Gui.CatalogView {
  export interface Manager {
    readonly listIds: string[];
    populateDatalist(id: string, entries: any[]): void;
    refreshPickerDatalist(input: any): void;
    renderCatalogList(target: any, entries: any[], options: any): void;
    renderVirtualCatalog(target: any): void;
    renderActiveCatalogs(): void;
    setupCatalogTools(): void;
  }

  const DEFAULT_CATALOG_ROW_HEIGHT = 88;
  const CATALOG_PAGE_SIZE = 20;
  const DATALIST_LIMIT = 80;
  const CATALOG_LIST_IDS = [
    "itemList",
    "skillList",
    "babySkillList",
    "actorList",
    "titleList",
    "costumeList",
    "variableList",
    "switchList",
    "mapList",
    "offlineHuntMapList",
    "offlineHuntTroopList",
    "commonEventList"
  ];

  export function create(options: {
    documentRef: Document;
    windowRef: Window;
    byId(id: string): any;
    escapeHtml(value: any): string;
    renderers: Record<string, () => void>;
    iconVersion(): number;
    updateCatalogToolLabels?(target: any): void;
    activateAdjacentToolSection(direction?: number): void;
  }): Manager {
    const catalogViews = new Map<string, any>();
    const catalogPages = new Map<string, any>();
    const datalistSources = new Map<string, any[]>();

    function entryMatchesSearch(entry, needle): boolean {
      if (!needle) return true;
      if (entry.searchText && entry.searchText.includes(needle)) return true;
      return [
        entry.id,
        entry.uid,
        entry.value,
        entry.label,
        entry.name,
        entry.description,
        entry.noteText
      ].some((part) => String(part == null ? "" : part).toLowerCase().includes(needle));
    }

    function filterDatalistEntries(entries, query, limit): any[] {
      const needle = String(query || "").trim().toLowerCase();
      if (!needle) return entries.slice(0, limit);
      const result = [];
      for (const entry of entries) {
        if (!entryMatchesSearch(entry, needle)) continue;
        result.push(entry);
        if (result.length >= limit) break;
      }
      return result;
    }

    function filterEntries(entries, query): any {
      const needle = String(query || "").trim().toLowerCase();
      if (!needle) {
        return {
          entries: entries.slice(),
          total: entries.length,
          hasMore: false,
          exact: true
        };
      }
      const result = [];
      for (const entry of entries) {
        if (!entryMatchesSearch(entry, needle)) continue;
        result.push(entry);
      }
      return {
        entries: result,
        total: result.length,
        hasMore: false,
        exact: true
      };
    }

    function catalogEntryKey(entry, rowOptions): any {
      return rowOptions.key ? rowOptions.key(entry) : entry.id;
    }

    function catalogPageFor(targetId, queryKey): any {
      const current = catalogPages.get(targetId);
      if (current && current.queryKey === queryKey) return current;
      const next = { queryKey, page: 1, pageSize: CATALOG_PAGE_SIZE };
      catalogPages.set(targetId, next);
      return next;
    }

    function clampCatalogPage(state, total): number {
      const pageCount = Math.max(1, Math.ceil(Math.max(0, Number(total || 0)) / state.pageSize));
      state.page = Math.min(Math.max(1, Math.floor(Number(state.page || 1))), pageCount);
      return pageCount;
    }

    function catalogPageStart(state): number {
      return (Math.max(1, Number(state.page || 1)) - 1) * state.pageSize;
    }

    function catalogCountText(result, page, pageCount): string {
      if (!result.total) return "0 条";
      return `共 ${result.total} 条 / ${page}/${pageCount} 页`;
    }

    function catalogRowHeight(): number {
      if (options.windowRef.innerWidth <= 760) return 128;
      if (options.documentRef.body.classList.contains("zoom-scroll-mode")) return 112;
      if (options.documentRef.body.classList.contains("page-scroll-mode")) return 100;
      return DEFAULT_CATALOG_ROW_HEIGHT;
    }

    function catalogRowHtml(entry, rowOptions, selectedId, top, rowHeight): string {
      const rowKey = rowOptions.key ? rowOptions.key(entry) : entry.id;
      const rowKind = rowOptions.rowKind ? rowOptions.rowKind(entry) : rowOptions.kind || "";
      const active = String(rowKey) === String(selectedId) ? " active" : "";
      const leading = rowOptions.leading(entry);
      const actions = rowOptions.actions(entry);
      const extra = rowOptions.extra ? rowOptions.extra(entry) : "";
      const description = rowOptions.description ? rowOptions.description(entry) : "";
      return `<div class="catalog-row${active}" style="top:${top}px;--catalog-row-height:${rowHeight}px" data-kind="${options.escapeHtml(rowKind)}" data-id="${entry.id}">
      ${leading}
      <div class="catalog-main">
        <span class="catalog-name">${options.escapeHtml(entry.name)}</span>
        <span class="catalog-meta">ID ${entry.id}${extra ? " / " + options.escapeHtml(extra) : ""}</span>
        ${description ? `<span class="catalog-desc">${options.escapeHtml(description)}</span>` : ""}
      </div>
      <div class="catalog-actions">${actions}</div>
    </div>`;
    }

    function elementIsVisible(element): boolean {
      return !!(element && element.offsetParent !== null && !element.closest("[hidden]"));
    }

    function updateCatalogToolLabels(target): void {
      const tools = target.__catalogTools;
      if (!tools) return;
      const collapsed = target.classList.contains("catalog-list-collapsed");
      const expanded = target.classList.contains("catalog-list-expanded");
      const collapseButton = tools.querySelector('[data-catalog-tool="collapse"]');
      const expandButton = tools.querySelector('[data-catalog-tool="expand"]');
      if (collapseButton) collapseButton.textContent = collapsed ? "显示" : "收起";
      if (expandButton) expandButton.textContent = expanded ? "标准" : "展开";
    }

    function updateCatalogLimitTools(target): void {
      const tools = target.__catalogTools;
      if (!tools) return;
      const view = catalogViews.get(target.id);
      const status = tools.querySelector('[data-catalog-tool="page-status"]');
      const firstButton = tools.querySelector('[data-catalog-tool="first"]') as HTMLButtonElement;
      const prevButton = tools.querySelector('[data-catalog-tool="prev"]') as HTMLButtonElement;
      const nextButton = tools.querySelector('[data-catalog-tool="next"]') as HTMLButtonElement;
      const lastButton = tools.querySelector('[data-catalog-tool="last"]') as HTMLButtonElement;
      if (!view) {
        if (status) status.textContent = "第 1 / 1 页";
        [firstButton, prevButton, nextButton, lastButton].forEach((button) => {
          if (button) button.disabled = true;
        });
        return;
      }
      const visibleCount = view.entries ? view.entries.length : 0;
      const total = view.filtered ? Number(view.filtered.total || 0) : 0;
      const page = Number(view.page || 1);
      const pageCount = Number(view.pageCount || 1);
      if (status) {
        status.textContent = total ? `第 ${page} / ${pageCount} 页 · 本页 ${visibleCount} 条` : "无结果";
      }
      if (firstButton) firstButton.disabled = page <= 1 || !total;
      if (prevButton) prevButton.disabled = page <= 1 || !total;
      if (nextButton) nextButton.disabled = page >= pageCount || !total;
      if (lastButton) lastButton.disabled = page >= pageCount || !total;
    }

    function renderVirtualCatalog(target): void {
      const view = catalogViews.get(target.id);
      if (!view) return;
      if (!elementIsVisible(target)) return;
      if (target.classList.contains("catalog-list-collapsed")) return;
      const entries = view.entries;
      const rowOptions = view.options;
      if (!entries.length) {
        target.innerHTML = '<div class="catalog-empty">没有匹配项</div>';
        view.renderKey = "empty";
        return;
      }
      const rowHeight = view.rowHeight;
      const selectedId = rowOptions.selectedId;
      const renderKey = `static:${selectedId}:${view.page}:${entries.length}:${target.clientWidth}:${rowHeight}:${options.iconVersion()}`;
      if (view.renderKey === renderKey) return;
      view.renderKey = renderKey;
      const rows = entries.map((entry, index) => catalogRowHtml(entry, rowOptions, selectedId, index * rowHeight, rowHeight));
      target.innerHTML = `<div class="catalog-spacer" style="height:${entries.length * rowHeight}px">${rows.join("")}</div>`;
    }

    function renderCatalogList(target, entries, rowOptions): void {
      const previous = catalogViews.get(target.id);
      const queryKey = `${rowOptions.kind || ""}:${rowOptions.query || ""}`;
      const pageState = catalogPageFor(target.id, queryKey);
      const filtered = filterEntries(entries, rowOptions.query);
      let pageCount = clampCatalogPage(pageState, filtered.total);
      const selectedKey = rowOptions.selectedId == null ? "" : String(rowOptions.selectedId);
      const shouldLocateSelected = previous && previous.selectedKey !== selectedKey && selectedKey && filtered.entries.length;
      if (shouldLocateSelected) {
        const selectedIndex = filtered.entries.findIndex((entry) => String(catalogEntryKey(entry, rowOptions)) === selectedKey);
        if (selectedIndex >= 0) {
          pageState.page = Math.floor(selectedIndex / pageState.pageSize) + 1;
          pageCount = clampCatalogPage(pageState, filtered.total);
        }
      }
      const pageStart = catalogPageStart(pageState);
      const visibleEntries = filtered.entries.slice(pageStart, pageStart + pageState.pageSize);
      catalogViews.set(target.id, {
        entries: visibleEntries,
        sourceEntries: entries,
        filteredEntries: filtered.entries,
        options: rowOptions,
        rowHeight: catalogRowHeight(),
        queryKey,
        page: pageState.page,
        pageSize: pageState.pageSize,
        pageCount,
        filtered,
        selectedKey
      });
      if (!previous || previous.queryKey !== queryKey) target.scrollTop = 0;
      if (rowOptions.countTarget) {
        rowOptions.countTarget.textContent = catalogCountText(filtered, pageState.page, pageCount);
      }
      updateCatalogLimitTools(target);
      if (!elementIsVisible(target)) return;
      renderVirtualCatalog(target);
    }

    function changeCatalogPage(target, action): void {
      const view = catalogViews.get(target.id);
      if (!view) return;
      const state = catalogPageFor(target.id, view.queryKey);
      const pageCount = Math.max(1, Number(view.pageCount || 1));
      let nextPage = Number(state.page || 1);
      if (action === "first") nextPage = 1;
      else if (action === "prev") nextPage -= 1;
      else if (action === "next") nextPage += 1;
      else if (action === "last") nextPage = pageCount;
      nextPage = Math.min(Math.max(1, Math.floor(nextPage)), pageCount);
      if (nextPage === state.page) return;
      state.page = nextPage;
      target.scrollTop = 0;
      if (options.renderers[target.id]) options.renderers[target.id]();
    }

    function toggleCatalogCollapsed(target): void {
      const collapsed = target.classList.toggle("catalog-list-collapsed");
      if (collapsed) target.classList.remove("catalog-list-expanded");
      updateCatalogToolLabels(target);
      if (!collapsed) options.windowRef.requestAnimationFrame(() => renderVirtualCatalog(target));
    }

    function toggleCatalogExpanded(target): void {
      target.classList.remove("catalog-list-collapsed");
      target.classList.toggle("catalog-list-expanded");
      updateCatalogToolLabels(target);
      options.windowRef.requestAnimationFrame(() => renderVirtualCatalog(target));
    }

    function setupCatalogTools(): void {
      CATALOG_LIST_IDS.forEach((id) => {
        const target = options.byId(id);
        if (!target || target.__catalogTools) return;
        const tools = options.documentRef.createElement("div");
        tools.className = "catalog-tools";
        tools.innerHTML = `
        <button type="button" data-catalog-tool="collapse">收起</button>
        <button type="button" data-catalog-tool="expand">展开</button>
        <button type="button" data-catalog-tool="first">首页</button>
        <button type="button" data-catalog-tool="prev">上一页</button>
        <span class="catalog-page-status" data-catalog-tool="page-status">第 1 / 1 页</span>
        <button type="button" data-catalog-tool="next">下一页</button>
        <button type="button" data-catalog-tool="last">末页</button>
        <button type="button" data-catalog-tool="next-section">下一分类</button>
      `;
        target.parentNode.insertBefore(tools, target);
        target.__catalogTools = tools;
        tools.addEventListener("click", (event) => {
          const button = (event.target as HTMLElement).closest("[data-catalog-tool]") as HTMLElement;
          if (!button) return;
          const action = button.dataset.catalogTool;
          if (action === "collapse") toggleCatalogCollapsed(target);
          else if (action === "expand") toggleCatalogExpanded(target);
          else if (action === "first" || action === "prev" || action === "next" || action === "last") changeCatalogPage(target, action);
          else if (action === "next-section") options.activateAdjacentToolSection(1);
        });
        updateCatalogToolLabels(target);
      });
    }

    return {
      listIds: CATALOG_LIST_IDS.slice(),
      populateDatalist(id: string, entries: any[]): void {
        const list = options.byId(id);
        if (!list) return;
        datalistSources.set(id, entries || []);
        list.innerHTML = filterDatalistEntries(entries || [], "", DATALIST_LIMIT)
          .map((entry) => {
            const value = entry.value != null ? entry.value : entry.uid != null ? entry.uid : entry.id;
            const label = entry.label || entry.name;
            return `<option value="${options.escapeHtml(value)}" label="${options.escapeHtml(label)}"></option>`;
          })
          .join("");
      },
      refreshPickerDatalist(input: any): void {
        const listId = input.getAttribute("list");
        if (!listId) return;
        const entries = datalistSources.get(listId);
        if (!entries) return;
        const list = options.byId(listId);
        if (!list) return;
        list.innerHTML = filterDatalistEntries(entries, input.value, DATALIST_LIMIT)
          .map((entry) => {
            const value = entry.value != null ? entry.value : entry.uid != null ? entry.uid : entry.id;
            const label = entry.label || entry.name;
            return `<option value="${options.escapeHtml(value)}" label="${options.escapeHtml(label)}"></option>`;
          })
          .join("");
      },
      renderCatalogList,
      renderVirtualCatalog,
      renderActiveCatalogs(): void {
        CATALOG_LIST_IDS.forEach((id) => {
          const element = options.byId(id);
          if (elementIsVisible(element) && options.renderers[id]) options.renderers[id]();
        });
      },
      setupCatalogTools
    };
  }
}
