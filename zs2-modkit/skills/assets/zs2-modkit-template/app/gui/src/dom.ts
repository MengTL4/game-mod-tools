namespace Zs2Gui.Dom {
  export function byId(documentRef: Document, id: string): any {
    return documentRef.getElementById(id);
  }

  export function create(documentRef: Document): any {
    const $ = (id: string): any => byId(documentRef, id);
    return {
      statusPill: $("statusPill"),
      launchBtn: $("launchBtn"),
      refreshBtn: $("refreshBtn"),
      bridgeState: $("bridgeState"),
      partyState: $("partyState"),
      goldState: $("goldState"),
      goldMetric: $("goldMetric"),
      saveState: $("saveState"),
      mapState: $("mapState"),
      saveFiles: $("saveFiles"),
      partyMembers: $("partyMembers"),
      variableList: $("variableList"),
      variableListCount: $("variableListCount"),
      switchList: $("switchList"),
      switchListCount: $("switchListCount"),
      itemList: $("itemList"),
      itemListCount: $("itemListCount"),
      skillList: $("skillList"),
      skillListCount: $("skillListCount"),
      babySkillList: $("babySkillList"),
      babySkillListCount: $("babySkillListCount"),
      actorList: $("actorList"),
      actorListCount: $("actorListCount"),
      mapList: $("mapList"),
      mapListCount: $("mapListCount"),
      offlineHuntMapList: $("offlineHuntMapList"),
      offlineHuntMapListCount: $("offlineHuntMapListCount"),
      offlineHuntTroopList: $("offlineHuntTroopList"),
      offlineHuntTroopListCount: $("offlineHuntTroopListCount"),
      offlineHuntMetric: $("offlineHuntMetric"),
      offlineHuntState: $("offlineHuntState"),
      offlineHuntResult: $("offlineHuntResult"),
      commonEventList: $("commonEventList"),
      commonEventListCount: $("commonEventListCount"),
      eventList: $("eventList"),
      babyMetric: $("babyMetric"),
      babyHint: $("babyHint"),
      babyState: $("babyState"),
      babyList: $("babyList"),
      talentPointMetric: $("talentPointMetric"),
      talentState: $("talentState"),
      titleList: $("titleList"),
      titleListCount: $("titleListCount"),
      costumeList: $("costumeList"),
      costumeListCount: $("costumeListCount"),
      battleState: $("battleState"),
      toolSectionNav: $("toolSectionNav"),
      toast: $("toast")
    };
  }
}
