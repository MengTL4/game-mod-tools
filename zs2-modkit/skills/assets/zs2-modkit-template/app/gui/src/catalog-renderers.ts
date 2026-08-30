namespace Zs2Gui.CatalogRenderers {
  export interface Context {
    catalogs: Record<string, any[]>;
    catalogView: Zs2Gui.CatalogView.Manager;
    iconRenderer: Zs2Gui.IconRenderer.Renderer;
    dom: any;
    byId(id: string): any;
    selectedNumber(id: string): number;
    parseItemSelection(): any;
    itemSelectionKey(selection: any): string;
  }

  export interface RendererSet {
    renderers: Record<string, () => void>;
    renderItemList(): void;
    renderSkillList(): void;
    renderBabySkillList(): void;
    renderTitleList(): void;
    renderCostumeList(): void;
    renderActorList(): void;
    renderVariableList(): void;
    renderSwitchList(): void;
    renderMapList(): void;
    renderOfflineHuntMapList(): void;
    renderOfflineHuntTroopList(): void;
    renderCommonEventList(): void;
  }

  export function create(context: Context): RendererSet {
    function renderItemList(): void {
      const kind = context.byId("itemKind").value;
      const entries = context.catalogs[kind] || [];
      const selection = context.parseItemSelection();
      context.catalogView.renderCatalogList(context.dom.itemList, entries, {
        kind,
        query: context.byId("itemSearch").value,
        selectedId: kind === "all" ? context.itemSelectionKey(selection) : selection.id,
        key: (entry) => entry.uid || entry.id,
        rowKind: (entry) => entry.kind || kind,
        leading: (entry) => context.iconRenderer.iconHtml(entry.iconIndex),
        extra: (entry) => entry.kindLabel || "",
        actions: (entry) => `<button data-catalog-action="item-add" data-kind="${entry.kind || kind}" data-id="${entry.id}">添加</button>`,
        description: (entry) => entry.description || entry.noteText,
        countTarget: context.dom.itemListCount
      });
    }

    function renderSkillList(): void {
      const entries = context.catalogs.skill || [];
      context.catalogView.renderCatalogList(context.dom.skillList, entries, {
        kind: "skill",
        query: context.byId("skillSearch").value,
        selectedId: context.selectedNumber("skillId"),
        leading: (entry) => context.iconRenderer.iconHtml(entry.iconIndex),
        actions: (entry) => `<button data-catalog-action="skill-learn" data-id="${entry.id}">学会</button><button data-catalog-action="skill-forget" data-id="${entry.id}">遗忘</button>`,
        description: (entry) => entry.description || entry.noteText,
        countTarget: context.dom.skillListCount
      });
    }

    function renderBabySkillList(): void {
      const entries = context.catalogs.skill || [];
      context.catalogView.renderCatalogList(context.dom.babySkillList, entries, {
        kind: "babySkill",
        query: context.byId("babySkillSearch").value,
        selectedId: context.selectedNumber("babySkillId"),
        leading: (entry) => context.iconRenderer.iconHtml(entry.iconIndex),
        actions: (entry) => `<button data-catalog-action="baby-skill-learn" data-id="${entry.id}">添加</button><button data-catalog-action="baby-skill-forget" data-id="${entry.id}">移除</button>`,
        description: (entry) => entry.description || entry.noteText,
        countTarget: context.dom.babySkillListCount
      });
    }

    function renderTitleList(): void {
      const entries = context.catalogs.title || [];
      context.catalogView.renderCatalogList(context.dom.titleList, entries, {
        kind: "title",
        query: context.byId("titleSearch").value,
        selectedId: context.selectedNumber("titleId"),
        leading: (entry) => context.iconRenderer.badgeHtml(entry.id, "title"),
        extra: (entry) => entry.sourceId ? `成就 ${entry.sourceId}` : "",
        actions: (entry) => `<button data-catalog-action="title-unlock" data-id="${entry.id}">解锁</button>`,
        description: (entry) => entry.description,
        countTarget: context.dom.titleListCount
      });
    }

    function renderCostumeList(): void {
      const entries = context.catalogs.costume || [];
      context.catalogView.renderCatalogList(context.dom.costumeList, entries, {
        kind: "costume",
        query: context.byId("costumeSearch").value,
        selectedId: context.selectedNumber("costumeId"),
        leading: (entry) => context.iconRenderer.badgeHtml(entry.id, "cloth"),
        extra: (entry) => [entry.equipId ? `装备 ${entry.equipId}` : "", entry.characterName].filter(Boolean).join(" / "),
        actions: (entry) => `<button data-catalog-action="costume-unlock" data-id="${entry.id}">解锁</button>`,
        description: (entry) => entry.description,
        countTarget: context.dom.costumeListCount
      });
    }

    function renderActorList(): void {
      const entries = context.catalogs.actor || [];
      context.catalogView.renderCatalogList(context.dom.actorList, entries, {
        kind: "actor",
        query: context.byId("actorSearch").value,
        selectedId: context.selectedNumber("actorId"),
        leading: context.iconRenderer.actorAvatarHtml,
        extra: (entry) => entry.faceName || entry.characterName || "",
        actions: (entry) => `<button data-catalog-action="actor-unlock" data-id="${entry.id}">解锁</button><button data-catalog-action="actor-select" data-id="${entry.id}">编辑</button>`,
        countTarget: context.dom.actorListCount
      });
    }

    function renderVariableList(): void {
      const entries = context.catalogs.variable || [];
      context.catalogView.renderCatalogList(context.dom.variableList, entries, {
        kind: "variable",
        query: context.byId("variableSearch").value,
        selectedId: context.selectedNumber("variableId"),
        leading: (entry) => context.iconRenderer.badgeHtml(entry.id, "var"),
        actions: (entry) => `<button data-catalog-action="variable-select" data-id="${entry.id}">填入</button><button data-catalog-action="variable-set" data-id="${entry.id}">写入</button>`,
        countTarget: context.dom.variableListCount
      });
    }

    function renderSwitchList(): void {
      const entries = context.catalogs.switch || [];
      context.catalogView.renderCatalogList(context.dom.switchList, entries, {
        kind: "switch",
        query: context.byId("switchSearch").value,
        selectedId: context.selectedNumber("switchId"),
        leading: (entry) => context.iconRenderer.badgeHtml(entry.id, "switch"),
        actions: (entry) => `<button data-catalog-action="switch-on" data-id="${entry.id}">ON</button><button data-catalog-action="switch-off" data-id="${entry.id}">OFF</button>`,
        countTarget: context.dom.switchListCount
      });
    }

    function renderMapList(): void {
      const entries = context.catalogs.map || [];
      context.catalogView.renderCatalogList(context.dom.mapList, entries, {
        kind: "map",
        query: context.byId("mapSearch").value,
        selectedId: context.selectedNumber("mapId"),
        leading: (entry) => context.iconRenderer.badgeHtml(entry.id, "map"),
        actions: (entry) => `<button data-catalog-action="map-transfer" data-id="${entry.id}">传送</button>`,
        description: (entry) => entry.description,
        countTarget: context.dom.mapListCount
      });
    }

    function renderOfflineHuntMapList(): void {
      const entries = context.catalogs.huntMap || [];
      context.catalogView.renderCatalogList(context.dom.offlineHuntMapList, entries, {
        kind: "huntMap",
        query: context.byId("offlineHuntMapSearch").value,
        selectedId: context.selectedNumber("offlineHuntMapId"),
        leading: (entry) => context.iconRenderer.badgeHtml(entry.id, "map"),
        extra: (entry) => entry.hasEncounters ? "" : "无遇敌",
        actions: (entry) => entry.hasEncounters
          ? `<button data-catalog-action="offline-hunt-select" data-id="${entry.id}">选择</button>`
          : `<button disabled title="没有随机遇敌配置">无遇敌</button>`,
        description: (entry) => entry.description,
        countTarget: context.dom.offlineHuntMapListCount
      });
    }

    function renderOfflineHuntTroopList(): void {
      const entries = context.catalogs.troop || [];
      context.catalogView.renderCatalogList(context.dom.offlineHuntTroopList, entries, {
        kind: "huntTroop",
        query: context.byId("offlineHuntTroopSearch").value,
        selectedId: context.selectedNumber("offlineHuntTroopId"),
        leading: (entry) => context.iconRenderer.badgeHtml(entry.id, "troop"),
        actions: (entry) => `<button data-catalog-action="offline-troop-select" data-id="${entry.id}">选择</button><button data-catalog-action="offline-troop-run" data-id="${entry.id}">执行</button><button data-catalog-action="battle-start" data-id="${entry.id}">战斗</button>`,
        extra: (entry) => entry.tags && entry.tags.length ? entry.tags.join("/") : "",
        description: (entry) => entry.description,
        countTarget: context.dom.offlineHuntTroopListCount
      });
    }

    function renderCommonEventList(): void {
      const entries = context.catalogs.commonEvent || [];
      context.catalogView.renderCatalogList(context.dom.commonEventList, entries, {
        kind: "commonEvent",
        query: context.byId("commonEventSearch").value,
        selectedId: context.selectedNumber("commonEventId"),
        leading: (entry) => context.iconRenderer.badgeHtml(entry.id, "event"),
        actions: (entry) => `<button data-catalog-action="common-event-run" data-id="${entry.id}">运行</button>`,
        description: (entry) => entry.description,
        countTarget: context.dom.commonEventListCount
      });
    }

    const renderers: Record<string, () => void> = {
      itemList: renderItemList,
      skillList: renderSkillList,
      babySkillList: renderBabySkillList,
      actorList: renderActorList,
      titleList: renderTitleList,
      costumeList: renderCostumeList,
      variableList: renderVariableList,
      switchList: renderSwitchList,
      mapList: renderMapList,
      offlineHuntMapList: renderOfflineHuntMapList,
      offlineHuntTroopList: renderOfflineHuntTroopList,
      commonEventList: renderCommonEventList
    };

    return {
      renderers,
      renderItemList,
      renderSkillList,
      renderBabySkillList,
      renderTitleList,
      renderCostumeList,
      renderActorList,
      renderVariableList,
      renderSwitchList,
      renderMapList,
      renderOfflineHuntMapList,
      renderOfflineHuntTroopList,
      renderCommonEventList
    };
  }
}
