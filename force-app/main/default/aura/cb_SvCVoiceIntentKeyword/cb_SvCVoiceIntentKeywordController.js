({
  onInit: function (c, e, h) {
    if (!c.get("v.isListnerSet")) {
      h.subscribeToVoiceToolkit(c);
    }
  },
  onDestroy: function (c, e, h) {
    h.unsubscribeFromVoiceToolkit(c);
  },
  click: function (c, e, h) {
    const keyword = e.currentTarget.dataset.label;
    c.find("input").set("v.value", keyword);
    c.set("v.keyword", keyword);
  },
  search: function (c, e, h) {
    const val = c.find("input").get("v.value");
    if (val.length > 1) {
      c.set("v.keyword", val);
    }
  },
  transcript: function (c, e, h) {
    const val = c.find("transcript").get("v.value");
    if (val.length > 1) {
      h.executeAction(c, "getIntent", { text: val }).then((res) => {
        h.updateLabels(c, JSON.parse(res));
      });
    }
  },
  refresh: function (c, e, h) {
    c.set("v.labels", []);
  }
});
