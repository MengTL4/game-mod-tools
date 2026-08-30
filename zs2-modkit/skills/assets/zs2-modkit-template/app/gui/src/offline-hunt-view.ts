namespace Zs2Gui.OfflineHuntView {
  export function create(context: any): any {
    const dom = context.dom;
    const catalogs = context.catalogs;
    const itemKindLabels = context.itemKindLabels;
    const escapeHtml = context.escapeHtml;
    const formatNumber = context.formatNumber;

    function compactListHtml(rows, emptyText, itemText, limit = 8) {
      if (!Array.isArray(rows) || !rows.length) return `<span>${escapeHtml(emptyText)}</span>`;
      return rows.slice(0, limit).map(itemText).join("");
    }

    function chanceText(chance) {
      const value = Number(chance);
      if (!Number.isFinite(value)) return "";
      const percent = Math.max(0, value * 100);
      return `${percent >= 10 ? Math.round(percent) : Math.round(percent * 10) / 10}%`;
    }

    function previewDropRows(preview) {
      const groups: Record<string, any> = {};
      (preview && preview.troops || []).forEach((row) => {
        (row.preview && row.preview.possibleDrops || []).forEach((drop) => {
          if (!drop || !drop.kind || !drop.id) return;
          const key = `${drop.kind}:${drop.id}`;
          if (!groups[key]) {
            groups[key] = {
              kind: drop.kind,
              id: drop.id,
              name: drop.name || "",
              chance: Number(drop.chance || 0),
              quality: drop.quality,
              qualityLabel: drop.qualityLabel || "",
              troops: new Set()
            };
          }
          groups[key].chance = Math.max(Number(groups[key].chance || 0), Number(drop.chance || 0));
          groups[key].troops.add(row.troopId);
        });
      });
      const order = { item: 1, weapon: 2, armor: 3 };
      return Object.values(groups)
        .map((entry: any) => ({ ...entry, troopCount: entry.troops.size }))
        .sort((a: any, b: any) => (order[a.kind] || 9) - (order[b.kind] || 9) || b.chance - a.chance || a.id - b.id);
    }

    function dropKindSummary(rows) {
      const counts = rows.reduce((total, row) => {
        total[row.kind] = Number(total[row.kind] || 0) + 1;
        return total;
      }, {});
      return [
        `物品 ${formatNumber(counts.item || 0)} 种`,
        `武器 ${formatNumber(counts.weapon || 0)} 种`,
        `防具 ${formatNumber(counts.armor || 0)} 种`
      ].join(" / ");
    }

    function dropChipName(row) {
      const quality = row && row.qualityLabel ? `[${row.qualityLabel}] ` : "";
      return `${quality}${row && (row.name || `${row.kind}:${row.id}`) || ""}`;
    }

    function update(offlineHunt, offlineHuntMode) {
      const last = offlineHunt && offlineHunt.last;
      const preview = offlineHunt && offlineHunt.preview;
      const showPreview = preview && (!last || Number(preview.ts || 0) >= Number(last.ts || 0));
      if (!offlineHunt) {
        dom.offlineHuntMetric.textContent = "0";
        dom.offlineHuntState.textContent = "等待运行时状态";
        dom.offlineHuntResult.innerHTML = "";
        return;
      }
      if (!offlineHunt.dataAvailable) {
        dom.offlineHuntMetric.textContent = "0";
        dom.offlineHuntState.textContent = "缺少 output/extract/data，先执行数据解包/解密";
        dom.offlineHuntResult.innerHTML = "";
        return;
      }
      if (showPreview || !last) {
        if (preview) {
          const average = preview.average || {};
          dom.offlineHuntMetric.textContent = `${formatNumber(average.exp || 0)} EXP/次`;
          dom.offlineHuntState.textContent = [
            preview.mode === "troop" ? `敌群 ${preview.troopId}` : `地图 ${preview.mapId}`,
            `预览 ${preview.name || preview.mapId}`,
            `${formatNumber(preview.encounterCount || 0)} 组遇敌`,
            `金币 ${formatNumber(average.gold || 0)}/次`,
            preview.encounterStep ? `步数 ${preview.encounterStep}` : ""
          ].filter(Boolean).join(" / ");
          const troops = compactListHtml(preview.troops, "无遇敌", (row) =>
            `<span class="result-chip">${escapeHtml(row.troopId)} ${escapeHtml(row.preview && row.preview.name || "")} / ${formatNumber(row.preview && row.preview.exp || 0)} EXP</span>`
          , 12);
          const dropRows = previewDropRows(preview);
          const drops = compactListHtml(dropRows, "无掉落表", (row) =>
            `<span class="result-chip">${escapeHtml(itemKindLabels[row.kind] || row.kind)}:${escapeHtml(dropChipName(row))} ${escapeHtml(chanceText(row.chance))}</span>`
          , 24);
          dom.offlineHuntResult.innerHTML = `
            <div><strong>预览</strong>${troops}</div>
            <div><strong>掉落分类</strong><span>${escapeHtml(dropKindSummary(dropRows))}</span></div>
            <div><strong>可能掉落</strong>${drops}</div>
          `;
          return;
        }
        dom.offlineHuntMetric.textContent = "0";
        dom.offlineHuntState.textContent = offlineHuntMode === "troop"
          ? `可用敌群 ${catalogs.troop.length} 个，先选择敌群并预览或执行一次`
          : `可挂机地图 ${catalogs.huntMap.filter((entry) => entry.hasEncounters).length} / 全部地图 ${catalogs.huntMap.length}，先预览或执行一次`;
        dom.offlineHuntResult.innerHTML = "";
        return;
      }
      const time = new Date(last.ts || Date.now()).toLocaleTimeString("zh-CN", { hour12: false });
      const lastMode = last.mode === "troop" || Number(last.fixedTroopId || 0) > 0 ? "troop" : "map";
      dom.offlineHuntMetric.textContent = `${formatNumber(last.exp || 0)} EXP`;
      dom.offlineHuntState.textContent = [
        `${time}`,
        lastMode === "troop" ? `敌群 ${last.fixedTroopId || last.troopId || ""}` : `地图 ${last.mapId}`,
        `${formatNumber(last.times)} 次`,
        `金币 ${formatNumber(last.gold || 0)}`,
        last.autoSell && last.autoSell.gold ? `自动卖 ${formatNumber(last.autoSell.gold)} 金币` : "",
        last.blockedDrops && last.blockedDrops.count ? `屏蔽 ${formatNumber(last.blockedDrops.count)} 件` : "",
        last.skippedDrops && last.skippedDrops.count ? `跳过 ${formatNumber(last.skippedDrops.count)} 件` : "",
        `掉落 ${formatNumber((last.dropSummary || []).length)} 种`,
        last.enemyBook && last.enemyBook.count ? `图鉴 ${last.enemyBook.count}` : "",
        last.saved ? `已保存 ${last.saved.id}` : ""
      ].filter(Boolean).join(" / ");
      const troops = compactListHtml(last.troopSummary, "无队列", (row) =>
        `<span class="result-chip">${escapeHtml(row.id)} ${escapeHtml(row.name || "")} x${formatNumber(row.count)}</span>`
      , 12);
      const drops = compactListHtml(last.dropSummary, "无掉落", (row) =>
        `<span class="result-chip">${escapeHtml(itemKindLabels[row.kind] || row.kind || "")}:${escapeHtml(dropChipName(row))} x${formatNumber(row.count)}</span>`
      , 24);
      const sold = compactListHtml(last.autoSell && last.autoSell.summary, "无自动卖出", (row) =>
        `<span class="result-chip">${escapeHtml(itemKindLabels[row.kind] || row.kind || "")}:${escapeHtml(dropChipName(row))} x${formatNumber(row.count)}</span>`
      , 16);
      const blocked = compactListHtml(last.blockedDrops && last.blockedDrops.summary, "无屏蔽", (row) =>
        `<span class="result-chip">${escapeHtml(itemKindLabels[row.kind] || row.kind || "")}:${escapeHtml(dropChipName(row))} x${formatNumber(row.count)}</span>`
      , 16);
      const skipped = compactListHtml(last.skippedDrops && last.skippedDrops.summary, "无跳过", (row) =>
        `<span class="result-chip">${escapeHtml(itemKindLabels[row.kind] || row.kind || "")}:${escapeHtml(dropChipName(row))} x${formatNumber(row.count)}</span>`
      , 16);
      const kindCounts = last.dropKindCounts || {};
      const dropKinds = [
        `物品 ${formatNumber(kindCounts.item || 0)} 种`,
        `武器 ${formatNumber(kindCounts.weapon || 0)} 种`,
        `防具 ${formatNumber(kindCounts.armor || 0)} 种`
      ].join(" / ");
      dom.offlineHuntResult.innerHTML = `
        <div><strong>遇敌</strong>${troops}</div>
        <div><strong>分类</strong><span>${escapeHtml(dropKinds)}</span></div>
        <div><strong>掉落</strong>${drops}</div>
        <div><strong>自动卖出</strong><span>${formatNumber(last.autoSell && last.autoSell.gold || 0)} 金币</span>${sold}</div>
        <div><strong>已屏蔽</strong>${blocked}</div>
        <div><strong>已跳过</strong>${skipped}</div>
      `;
    }

    return { update };
  }
}
