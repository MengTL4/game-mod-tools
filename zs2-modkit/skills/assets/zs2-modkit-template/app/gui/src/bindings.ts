namespace Zs2Gui.Bindings {
  export function bind(context: any): void {
    const documentRef: Document = context.documentRef;
    const $ = context.byId;
    const dom = context.dom;

    documentRef.querySelectorAll<HTMLElement>("[data-tool-tab]").forEach((button) => {
      button.addEventListener("click", () => context.activateTab(button.dataset.toolTab));
    });
    dom.toolSectionNav.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest("[data-tool-section-jump]") as HTMLElement;
      if (!button) return;
      context.activateToolSection(button.dataset.toolSectionJump || "");
    });
    dom.launchBtn.addEventListener("click", context.launchGame);
    dom.refreshBtn.addEventListener("click", context.refresh);
    dom.itemList.addEventListener("click", context.handleCatalogClick);
    dom.skillList.addEventListener("click", context.handleCatalogClick);
    dom.babySkillList.addEventListener("click", context.handleCatalogClick);
    dom.actorList.addEventListener("click", context.handleCatalogClick);
    dom.titleList.addEventListener("click", context.handleCatalogClick);
    dom.costumeList.addEventListener("click", context.handleCatalogClick);
    dom.variableList.addEventListener("click", context.handleCatalogClick);
    dom.switchList.addEventListener("click", context.handleCatalogClick);
    dom.mapList.addEventListener("click", context.handleCatalogClick);
    dom.offlineHuntMapList.addEventListener("click", context.handleCatalogClick);
    dom.offlineHuntTroopList.addEventListener("click", context.handleCatalogClick);
    dom.commonEventList.addEventListener("click", context.handleCatalogClick);
    dom.babyList.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest<HTMLElement>("[data-baby-select]");
      const row = target.closest<HTMLElement>("[data-baby-id]");
      const id = button && button.dataset.babySelect || row && row.dataset.babyId;
      if (id) context.selectBaby(Number(id));
    });
    context.bindVirtualScroll(dom.itemList);
    context.bindVirtualScroll(dom.skillList);
    context.bindVirtualScroll(dom.babySkillList);
    context.bindVirtualScroll(dom.actorList);
    context.bindVirtualScroll(dom.titleList);
    context.bindVirtualScroll(dom.costumeList);
    context.bindVirtualScroll(dom.variableList);
    context.bindVirtualScroll(dom.switchList);
    context.bindVirtualScroll(dom.mapList);
    context.bindVirtualScroll(dom.offlineHuntMapList);
    context.bindVirtualScroll(dom.offlineHuntTroopList);
    context.bindVirtualScroll(dom.commonEventList);
    context.catalogView.setupCatalogTools();
    context.bindViewportResize();

    $("goldSetBtn").addEventListener("click", () => context.sendCommand({ type: "gold.set", value: Number($("goldValue").value || 0) }));
    $("goldAddBtn").addEventListener("click", () => context.sendCommand({ type: "gold.add", amount: Number($("goldValue").value || 0) }));
    documentRef.querySelectorAll<HTMLElement>("[data-gold-add]").forEach((button) => {
      button.addEventListener("click", () => context.sendCommand({ type: "gold.add", amount: Number(button.dataset.goldAdd) }));
    });
    documentRef.querySelectorAll<HTMLElement>("[data-gold-set]").forEach((button) => {
      button.addEventListener("click", () => context.sendCommand({ type: "gold.set", value: Number(button.dataset.goldSet) }));
    });

    $("variableSetBtn").addEventListener("click", () => context.setVariable(context.numberValue("variableId", 0)));

    $("switchOnBtn").addEventListener("click", () => {
      context.setSwitchValue(true);
      $("switchOnBtn").classList.add("active");
      $("switchOffBtn").classList.remove("active");
    });
    $("switchOffBtn").addEventListener("click", () => {
      context.setSwitchValue(false);
      $("switchOffBtn").classList.add("active");
      $("switchOnBtn").classList.remove("active");
    });
    $("switchSetBtn").addEventListener("click", () => context.setSwitch(context.numberValue("switchId", 0), context.getSwitchValue()));

    $("itemAddBtn").addEventListener("click", () => {
      const selection = context.parseItemSelection();
      context.sendCommand({
        type: "item.add",
        kind: selection.kind,
        id: selection.id,
        amount: context.numberValue("itemAmount", 1)
      });
    });

    $("actorUnlockBtn").addEventListener("click", () => context.unlockActor(context.activeActorId()));
    $("actorAddBtn").addEventListener("click", () => context.sendCommand({ type: "actor.unlock", id: context.activeActorId() }));
    $("actorRemoveBtn").addEventListener("click", () => context.sendCommand({ type: "actor.remove", id: context.activeActorId() }));
    $("actorRecoverBtn").addEventListener("click", () => context.sendCommand({ type: "actor.recover", id: context.activeActorId() }));
    $("actorLevelBtn").addEventListener("click", () => context.sendCommand({
      type: "actor.level.set",
      id: context.activeActorId(),
      level: context.numberValue("actorLevel", 1)
    }));
    $("actorExpBtn").addEventListener("click", () => context.sendCommand({
      type: "actor.exp.add",
      id: context.activeActorId(),
      amount: context.numberValue("actorExp", 0)
    }));
    $("actorVitalsBtn").addEventListener("click", () => context.sendCommand({
      type: "actor.vitals.set",
      id: context.activeActorId(),
      hp: context.optionalNumber("actorHp"),
      mp: context.optionalNumber("actorMp"),
      tp: context.optionalNumber("actorTp")
    }));
    $("actorParamBtn").addEventListener("click", () => context.sendCommand({
      type: "actor.param.add",
      id: context.activeActorId(),
      paramId: context.numberValue("paramId", 0),
      value: context.numberValue("paramValue", 0)
    }));

    $("skillLearnBtn").addEventListener("click", () => context.sendCommand({
      type: "actor.skill.learn",
      id: context.skillActorId(),
      skillId: context.numberValue("skillId", 0)
    }));
    $("skillForgetBtn").addEventListener("click", () => context.sendCommand({
      type: "actor.skill.forget",
      id: context.skillActorId(),
      skillId: context.numberValue("skillId", 0)
    }));
    $("babyInfoBtn").addEventListener("click", () => context.sendCommand({ type: "baby.info" }));
    $("babySkillAddBtn").addEventListener("click", () => context.sendCommand(context.babyCommandBase("baby.skill.learn")));
    $("babySkillForgetBtn").addEventListener("click", () => context.sendCommand(context.babyCommandBase("baby.skill.forget")));
    $("babySlotsSetBtn").addEventListener("click", () => context.sendCommand(context.babySlotsCommand("baby.slots.set", 0)));
    $("babySlotsAddBtn").addEventListener("click", () => context.sendCommand(context.babySlotsCommand("baby.slots.add", 1)));
    $("babySkillClearPassiveBtn").addEventListener("click", () => {
      const command: any = { type: "baby.skill.clear", mode: "passive" };
      const id = context.optionalNumber("babyActorId");
      if (id !== undefined) command.id = id;
      context.sendCommand(command);
    });
    $("unlockEnemyBookBtn").addEventListener("click", () => context.sendCommand({ type: "progress.enemyBook.unlock" }));
    $("ratesApplyBtn").addEventListener("click", () => context.sendOptions({
      expRate: context.numberValue("expRate", 1),
      goldRate: context.numberValue("goldRate", 1),
      dropRate: context.numberValue("dropRate", 1)
    }));
    documentRef.querySelectorAll<HTMLElement>("[data-rate]").forEach((button) => {
      button.addEventListener("click", () => {
        const rate = Number(button.dataset.rate || 1);
        $("expRate").value = rate;
        $("goldRate").value = rate;
        $("dropRate").value = rate;
        context.sendOptions({ expRate: rate, goldRate: rate, dropRate: rate });
      });
    });
    $("talentPointSetBtn").addEventListener("click", () => context.sendCommand(context.talentCommandBase("talent.points.set")));
    $("talentPointAddBtn").addEventListener("click", () => context.sendCommand(context.talentCommandBase("talent.points.add")));
    $("talentPointPartyAddBtn").addEventListener("click", () => context.sendCommand(context.talentCommandBase("talent.points.add", true)));
    $("talentPointInfoBtn").addEventListener("click", () => context.sendCommand({ type: "talent.points.info", party: true }));
    $("titleUnlockBtn").addEventListener("click", () => context.unlockTitle(context.numberValue("titleId", 0)));
    $("titleUnlockAllBtn").addEventListener("click", () => context.sendCommand({ type: "title.unlockAll" }));
    $("titleInfoBtn").addEventListener("click", () => context.sendCommand({ type: "title.info" }));
    $("costumeUnlockBtn").addEventListener("click", () => context.unlockCostume(context.numberValue("costumeId", 0)));
    $("costumeUnlockAllBtn").addEventListener("click", () => context.sendCommand({ type: "costume.unlockAll" }));
    $("costumeInfoBtn").addEventListener("click", () => context.sendCommand({ type: "costume.info" }));

    $("noCostBtn").addEventListener("click", () => context.sendOptions({ noSkillCost: !$("noCostBtn").classList.contains("active") }));
    $("oneHitKillBtn").addEventListener("click", () => context.sendOptions({ oneHitKill: !$("oneHitKillBtn").classList.contains("active") }));
    $("invincibleBtn").addEventListener("click", () => context.sendOptions({ invincible: !$("invincibleBtn").classList.contains("active") }));
    $("battleKillBtn").addEventListener("click", () => context.sendCommand({ type: "battle.killEnemies" }));
    $("battleEscapeBtn").addEventListener("click", () => context.sendCommand({ type: "battle.escape" }));
    $("battleStartBtn").addEventListener("click", () => context.startBattle());
    $("offlineHuntPreviewBtn").addEventListener("click", context.previewOfflineHunt);
    $("offlineHuntRunBtn").addEventListener("click", context.runOfflineHunt);
    $("offlineHuntPreviewTroopBtn").addEventListener("click", context.previewOfflineHunt);
    $("offlineHuntRunTroopBtn").addEventListener("click", context.runOfflineHunt);
    $("offlineHuntClearTroopBtn").addEventListener("click", () => {
      context.setOfflineHuntMode("map");
      $("offlineHuntTroopId").value = "";
      context.updateLookupHints();
      context.catalogRenderers.renderOfflineHuntTroopList();
    });
    documentRef.querySelectorAll<HTMLElement>("[data-offline-hunt-times]").forEach((button) => {
      button.addEventListener("click", () => {
        $(context.getOfflineHuntMode() === "troop" ? "offlineHuntTroopTimes" : "offlineHuntMapTimes").value = String(button.dataset.offlineHuntTimes || 10);
      });
    });
    $("partyRecoverBtn").addEventListener("click", () => context.sendCommand({ type: "party.recover" }));
    $("mapTransferBtn").addEventListener("click", () => context.transferMap(context.numberValue("mapId", 0)));
    $("mapThroughBtn").addEventListener("click", () => context.sendCommand({
      type: "map.through.set",
      value: !$("mapThroughBtn").classList.contains("active")
    }));
    $("recordPositionBtn").addEventListener("click", context.recordCurrentPosition);
    $("returnPositionBtn").addEventListener("click", context.returnRecordedPosition);
    $("commonEventRunBtn").addEventListener("click", () => context.runCommonEvent(context.numberValue("commonEventId", 0)));

    $("saveGameBtn").addEventListener("click", () => context.sendCommand({ type: "save", id: Number($("saveSlot").value || 1) }));
    $("titleRefreshBtn").addEventListener("click", () => context.sendCommand({ type: "title.refresh" }));

    $("customSendBtn").addEventListener("click", () => {
      try {
        const command = JSON.parse($("customCommand").value);
        context.sendCommand(command);
      } catch (error) {
        context.showToast(`JSON 错误：${error.message}`, "error");
      }
    });

    $("openBridgeBtn").addEventListener("click", () => context.openFolder(context.bridgeDir));
    $("openSaveBtn").addEventListener("click", () => context.openFolder(context.saveDir));
    $("backupSaveBtn").addEventListener("click", context.backupSaves);
    $("clearEventsBtn").addEventListener("click", context.clearEvents);
  }
}
