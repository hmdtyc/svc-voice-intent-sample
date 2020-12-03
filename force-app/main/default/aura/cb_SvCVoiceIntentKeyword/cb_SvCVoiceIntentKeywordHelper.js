({
  subscribeToVoiceToolkit: function (c) {
    // https://developer.salesforce.com/docs/atlas.en-us.voice_developer_guide.meta/voice_developer_guide/voice_intro.htm
    c._conversationEventListener = $A.getCallback(
      this.conversationEventListener.bind(this, c)
    );
    c.find("voiceToolkitApi").addConversationEventListener(
      "TRANSCRIPT",
      c._conversationEventListener
    );
    c.set("v.isListnerSet", true);
  },
  unsubscribeFromVoiceToolkit: function (c) {
    c.find("voiceToolkitApi").removeConversationEventListener(
      "TRANSCRIPT",
      c._conversationEventListener
    );
    c.set("v.isListnerSet", false);
  },
  conversationEventListener: function (c, transcript) {
    if (
      !c.isValid() ||
      transcript.detail.callId != c.get("v.record.VendorCallKey")
    ) {
      // console.log('== IGNORE: EVENT FIRED FROM OTHER TABS ==');
      return;
    } else if (
      !!c.get("v.lastTranscript").detail &&
      c.get("v.lastTranscript").detail.serverReceivedTimestamp ==
        transcript.detail.serverReceivedTimestamp &&
      c.get("v.lastTranscript").detail.content.text ==
        transcript.detail.content.text
    ) {
      // console.log('== IGNORE: DUPLICATE EVENT FOR SOME UNKNOWN REASON ==');
      return;
    } else if (transcript.detail.sender.role != "EndUser") {
      // console.log('== IGNORE: TRANSCRIPT OF AGENT ==');
      return;
    } else if (
      transcript.detail.content.text.length < Number(c.get("v.minimumChars"))
    ) {
      // console.log('== IGNORE: TRANSCRIPT IS TOO SHORT ==');
      return;
    }
    try {
      c.set("v.transcript", JSON.stringify(transcript));
      this.executeAction(c, "getIntent", {
        text: transcript.detail.content.text
      }).then((res) => {
        this.updateLabels(c, JSON.parse(res));
      });
      c.set("v.lastTranscript", transcript);
    } catch (ex) {
      console.error(ex);
    }
  },
  updateLabels: function (c, intentResults) {
    const globalId = c.getGlobalId();
    const maximumLabels = c.get("v.maximumLabels");
    let labels = c.get("v.labels");
    let labelsToBeInserted = [];
    intentResults.forEach((r, idx) => {
      if (idx < maximumLabels && r.probability > 0.2) {
        let scale = "scale1";
        if (r.probability >= 0.36) {
          scale = "scale3";
        } else if (r.probability >= 0.3) {
          scale = "scale2";
        }
        r.scale = scale;
        r.priority = maximumLabels - 1;
        const overrideIdx = labels.findIndex((l) => {
          return l.label == r.label;
        });
        if (overrideIdx > -1) {
          r.id = `label_id_${overrideIdx}`;
          r.index = labels[overrideIdx].index;
          r.class = "show";
          r.previousScale = labels[overrideIdx].scale;
          r.priority = maximumLabels;
          labels[overrideIdx] = r;
        } else {
          labelsToBeInserted.push(r);
        }
      }
    });
    let lowestPriority = maximumLabels;
    labels.forEach((l) => {
      l.priority -= 1;
      l.class = "show";
      if (lowestPriority > l.priority) lowestPriority = l.priority;
    });
    let animationLabels = labels.concat();
    let labelIndexesToBeRemoved = [];
    while (labelsToBeInserted.length > 0) {
      let label;
      if (labels.length < maximumLabels) {
        label = labelsToBeInserted[0];
        label.id = `label_id_${labels.length}`;
        label.index = labels.length;
        label.class = "fadein";
        labels.push(label);
        animationLabels.push(label);
        labelsToBeInserted.splice(0, 1);
      } else {
          labels.filter((l) => {
            return l.priority == lowestPriority;
          })
          .sort((l1, l2) => {
            return l1.probability - l2.probability;
          })
          .forEach((t) => {
          if (labelsToBeInserted.length == 0) return;
          let removeIndex = labels.findIndex((l) => {
            return l.label == t.label;
          });
          labels[removeIndex].class = "fadeout";
          labelIndexesToBeRemoved.push(labels[removeIndex].index);
          label = labelsToBeInserted[0];
          label.id = labels[removeIndex].id;
          label.index = labels[removeIndex].index;
          label.class = "fadein";
          labels.splice(removeIndex, 1, label);
          animationLabels.push(label);
          labelsToBeInserted.splice(0, 1);
        });
        lowestPriority++;
      }
    }
    let animationFlg = labelIndexesToBeRemoved.length > 0;
    let scaleChangeLabels = [];
    animationLabels = JSON.parse(JSON.stringify(animationLabels));
    animationLabels.forEach((l) => {
      if (l.previousScale) {
        animationFlg = true;
        l.nextScale = l.scale;
        l.scale = l.previousScale;
        scaleChangeLabels.push(l);
      }
    });
    if (animationFlg) {
      c.set("v.labels", animationLabels);
      window.setTimeout(
        $A.getCallback(() => {
          scaleChangeLabels.forEach((l) => {
            const element = document.getElementById(globalId + l.id);
            if (element.className.indexOf("scale1") > -1)
              element.className = element.className.replace(
                "scale1",
                l.nextScale
              );
            else if (element.className.indexOf("scale2") > -1)
              element.className = element.className.replace(
                "scale2",
                l.nextScale
              );
            else if (element.className.indexOf("scale3") > -1)
              element.className = element.className.replace(
                "scale3",
                l.nextScale
              );
          });
        }),
        50
      );
      window.setTimeout(
        $A.getCallback(() => {
          labels.forEach((l) => {
            if (l.class == "fadein") {
              l.class = "show";
            }
          });
          c.set("v.labels", labels);
        }),
        1000
      );
    } else {
      c.set("v.labels", labels);
    }
  },
  showError: function (c, h, message) {
    const isOnAppBuilder =
      document.location.href.toLowerCase().indexOf("flexipageeditor") >= 0;
    if (isOnAppBuilder) {
      console.error(message);
      c.set("v.errorMessage", message);
    } else {
      const toastEvent = $A.get("e.force:showToast");
      toastEvent.setParams({
        type: "error",
        mode: "sticky",
        message: message
      });
      toastEvent.fire();
    }
  },
  executeAction: function (c, actionName, params) {
    const action = c.get(`c.${actionName}`);
    action.setParams(params);
    return new Promise((resolve, reject) => {
      action.setCallback(this, (response) => {
        const ret = response.getReturnValue();
        if (response.getState() === "SUCCESS") resolve(ret);
        else if (response.getState() === "ERROR") reject(response.getError());
      });
      $A.enqueueAction(action);
    });
  }
});
