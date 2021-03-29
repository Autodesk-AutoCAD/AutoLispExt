import { expect } from 'chai';
import { InputBox, Workbench } from 'vscode-extension-tester';

describe('Debug Configuration Test', () => {
  let input: InputBox;

  const attachCfgName:string = 'AutoLISP Debug: Attach';
  const launchCfgName:string = 'AutoLISP Debug: Attach';
  const startDebugCmd:string = 'workbench.action.debug.start';
  
  before(async () => {
  });

  after(async () => {
      await input.cancel();
  });  

  // to verify that the Attach and Launch config items show up when user starts to debug via. VS Code
  it('should show debug config items on F5', async  function() {
    this.timeout(15000);

    const workbench = new Workbench();
    await workbench.executeCommand(startDebugCmd);

    input = await InputBox.create();
    expect(await input.isDisplayed()).is.true;

    const picks = await input.getQuickPicks();
    expect(picks.find( async x=> await x.getText() === attachCfgName)).not.undefined;
    expect(picks.find( async x=> await x.getText() === launchCfgName)).not.undefined;
  });

});
