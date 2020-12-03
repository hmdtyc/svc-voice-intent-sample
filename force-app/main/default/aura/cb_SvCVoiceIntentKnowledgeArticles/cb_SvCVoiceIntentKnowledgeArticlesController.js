({
  init: function (c, e, h) {
    c.set("v.timezone", $A.get("$Locale.timezone"));
  },
  change: function (c, e, h) {
    const keyword = c.get("v.keyword");
    if (!keyword) return;
    h.executeAction(c, "getKnowledgeArticles", { keyword: keyword }).then(
      (res) => {
        c.set("v.articles", res);
      }
    );
  },
  clickDetail: function (c, e, h) {
    const workspaceAPI = c.find("workspace");
    console.log(JSON.parse(JSON.stringify(e.currentTarget.dataset)));
    if (workspaceAPI && typeof workspaceAPI.getFocusedTabInfo == "function") {
      workspaceAPI.getFocusedTabInfo().then((res) => {
        workspaceAPI.openSubtab({
          parentTabId: res.tabId,
          url: `/lightning/r/Knowledge__kav/${e.currentTarget.dataset.recordId}/view`,
          focus: true
        });
      });
    } else {
      window.open(`/lightning/r/${a.articleVersion.Id}/view`, "_blank");
    }
  }
});
