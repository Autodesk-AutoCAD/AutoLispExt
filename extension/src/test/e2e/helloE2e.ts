// import the webdriver and the high level browser wrapper
import { assert, expect } from 'chai';
import { QuickOpenBox, VSBrowser, WebDriver, Workbench } from 'vscode-extension-tester';

// Create a Mocha suite
describe('My Test Suite', () => {
  let browser: VSBrowser;
  let driver: WebDriver;
  let input: QuickOpenBox;
  
  // initialize the browser and webdriver
  before(async () => {
    browser = VSBrowser.instance;
    driver = browser.driver;
    input = await new Workbench().openCommandPrompt();
  });

  after(async () => {
      await input.cancel();
  });  
  // test whatever we want using webdriver, here we are just checking the page title
//   it('My Test Case', async () => {
//     const title = await driver.getTitle();
//     assert.equal(title, 'whatever');
//   });

  it('should show debugger selector', async () => {
    const workbench = new Workbench();
    await workbench.executeCommand('workbench.action.debug.start');
    expect(await input.isDisplayed()).true;
    const picks = await input.getQuickPicks();
    expect(picks.length).equals(1);

    const pick = await input.findQuickPick('Select Environment');
    expect(pick).not.undefined;
  });

});
