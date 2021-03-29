import { expect } from 'chai';
import { InputBox, Workbench } from 'vscode-extension-tester';

describe('Debug Configuration Test', () => {
  let input: InputBox;

  const attachConfigText:string = 'AutoLISP Debug: Attach';
  const launchConfigText:string = 'AutoLISP Debug: Launch';
  const startDebugCmd:string = 'workbench.action.debug.start';
  
  before(async () => {
  });

  after(async () => {
      await input.cancel();
  });  

  // to verify that the Attach and Launch config items show up when starting to debug via. VS Code
  it('should show debug config items on F5', async  function() {
    this.timeout(15000);

    const workbench = new Workbench();
    await workbench.executeCommand(startDebugCmd);

    input = await InputBox.create();
    expect(await input.isDisplayed()).is.true;

    const picks = await input.getQuickPicks();

    const attachCfg:InputBox[] = await findAll(picks, async (x:InputBox) => { return attachConfigText === await x.getText();});
    expect(attachCfg.length).equals(1);

    const launchCfg:InputBox[] = await findAll(picks, async (x:InputBox) => { return launchConfigText === await x.getText();});
    expect(launchCfg.length).equals(1);
  });

  async function findAll(array, callbackFind) : Promise<Array<InputBox>>{
    let ret:Array<InputBox> = [];

    for(const item of array) {
      const matched: boolean = await callbackFind(item);
      if(!matched)
        continue;
      
      ret.push(item);
    }

    return ret;
  }

});
