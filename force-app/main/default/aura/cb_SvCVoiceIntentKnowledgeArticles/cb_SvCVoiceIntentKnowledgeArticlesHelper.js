({
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
