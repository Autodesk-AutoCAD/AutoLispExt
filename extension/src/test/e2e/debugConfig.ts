import { expect } from 'chai';
import { InputBox, Workbench } from 'vscode-extension-tester';

describe('Debug Configuration Test', () => {
  let workbench: Workbench = null;
  let activeInput: InputBox = null;
  let debugStarted: boolean = false;

  const attachConfigText: string = 'AutoLISP Debug: Attach';
  const launchConfigText: string = 'AutoLISP Debug: Launch';

  const startDebugCmd: string = 'workbench.action.debug.start';
  const stopDebugCmd: string = 'workbench.action.debug.stop';

  const expectedAttachHint = 'Pick the process to attach.';
  const expectedLaunchHint = 'Specify the absolute path for the product.';

  beforeEach(async () => {
    activeInput = null;
    debugStarted = false;

    workbench = new Workbench();
    await workbench.executeCommand(startDebugCmd);
  });

  afterEach(async () => {
    if (activeInput) {
      if (await activeInput.isDisplayed())
        await activeInput.cancel();
    }

    if(debugStarted) {
      await workbench.executeCommand(stopDebugCmd);
    }
  });

  // to verify that the config item named "Attach" is really for attach mode
  it('should show debug config items on F5', async function () {
    const cmdInput = await getActiveInputBox();
    expect(await cmdInput.isDisplayed()).is.true;

    const picks = await cmdInput.getQuickPicks();

    const attachCfg: InputBox[] = await findAll(picks, async (x: InputBox) => { return attachConfigText === await x.getText(); });
    expect(attachCfg.length).equals(1);

    const launchCfg: InputBox[] = await findAll(picks, async (x: InputBox) => { return launchConfigText === await x.getText(); });
    expect(launchCfg.length).equals(1);
  });

  // to verify that the "Attach" config item is bound to attach mode
  it('should debug in attach mode after selecting Debug: Attach', async function () {
    const cmdInput = await getActiveInputBox();
    expect(await cmdInput.isDisplayed()).is.true;

    await cmdInput.setText(attachConfigText);
    await cmdInput.confirm();

    debugStarted = true;

    const procInput = await getActiveInputBox();
    expect((await procInput.getPlaceHolder()).startsWith(expectedAttachHint)).true;
  });

  // to verify that the config item named "Launch" is really for launch mode
  it('should debug in launch mode after selecting Debug: Launch', async function () {
    const cmdInput = await getActiveInputBox();
    expect(await cmdInput.isDisplayed()).is.true;

    await cmdInput.setText(launchConfigText);
    await cmdInput.confirm();

    debugStarted = true;

    const procInput = await getActiveInputBox();
    expect((await procInput.getPlaceHolder()).startsWith(expectedLaunchHint)).true;
  });

  async function findAll(array, callbackFind): Promise<Array<InputBox>> {
    let ret: Array<InputBox> = [];

    for (const item of array) {
      const matched: boolean = await callbackFind(item);
      if (!matched)
        continue;

      ret.push(item);
    }

    return ret;
  }

  async function getActiveInputBox(): Promise<InputBox> {
    let input = await InputBox.create();
    activeInput = input;

    return activeInput;
  }

});
