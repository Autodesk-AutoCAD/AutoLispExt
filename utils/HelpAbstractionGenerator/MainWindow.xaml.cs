using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using HAP = HtmlAgilityPack;
using HMS = mshtml;
using SHD = SHDocVw;

namespace HelpAbstractionGenerator
{
    // Note: Various xaml support Classes (Selectors/Attached Properties) are all defined in clearly labeled files within: /InterfaceUtilities/
    

    public partial class MainWindow : Window, INotifyPropertyChanged
    {
        #region Infrastructure
        private Dictionary<string, object> _vals = new Dictionary<string, object>();
        public event PropertyChangedEventHandler PropertyChanged;
        private void NotifyPropertyChanged(string propertyName = "")
        { PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName)); }
        private object FindValue(string key) 
        { return (_vals.ContainsKey(key) == true) ? _vals[key] : null; }
        private void ApplyValue(string key, object val) 
        { if (_vals.ContainsKey(key) == false) { _vals.Add(key, null); } _vals[key] = val; NotifyPropertyChanged(key); }
        #endregion


        #region Common Internal Properties
        string dataFolder; // initialized in MainWindow Constructor
        string ioPathLinkObjects { get { return dataFolder + "CatagorizedLinks.json"; } }
        string ioPathLinkList { get { return dataFolder + "LinkList.html"; } }        
        string ioPathRuleOverrides { get { return dataFolder + "ExportOverrides.json"; } }
        string ioPathHelpAbstraction { get { return dataFolder + "webHelpAbstraction.json"; } }
        #endregion


        #region Binding Properties
        public Dictionary<linkCategory, List<LinkObject>> CatagorizedLinks  { get; set; } = new Dictionary<linkCategory, List<LinkObject>>();

        public bool isIdle 
        { 
            get { return (bool)FindValue(nameof(isIdle)); }
            set { ApplyValue(nameof(isIdle), value); } 
        }

        public string navURL 
        { 
            get { return (string)FindValue(nameof(navURL)); } 
            set { ApplyValue(nameof(navURL), value); } 
        }        

        public WebObjectLibrary CurrentLib 
        { 
            get { return (WebObjectLibrary)FindValue(nameof(CurrentLib)); } 
            set { ApplyValue(nameof(CurrentLib), value); } 
        }

        public string Filter 
        { 
            get { return (string)FindValue(nameof(Filter)); } 
            set { ApplyValue(nameof(Filter), value); ApplyUserFilter(cmbOverridesFilterType?.SelectedItem?.getPropStringValue("Content"), value.ToUpper()); } 
        }

        public ObservableCollection<LinkObject> AllLinks
        {
            get { return (ObservableCollection<LinkObject>)FindValue(nameof(AllLinks)); }
            set { ApplyValue(nameof(AllLinks), value); }
        }

        public ObservableCollection<OverrideRule> AllOverrides
        {
            get { return (ObservableCollection<OverrideRule>)FindValue(nameof(AllOverrides)); }
            set { ApplyValue(nameof(AllOverrides), value); }
        }
        #endregion


        #region Common UI
        public MainWindow()
        {
            // initialize variables that cannot be null in the _vals Dictionary<string,object> that is used as a general purpose property backing variable for binding operations.
            AllLinks = new ObservableCollection<LinkObject>();
            AllOverrides = new ObservableCollection<OverrideRule>();
            navURL = urlHelpers.getHelpURL("4CEE5072-8817-4920-8A2D-7060F5E16547");
            dataFolder = System.IO.Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().GetName().CodeBase).Substring(6).TrimEnd('\\') + "\\Processing\\";
            isIdle = true; // only used in the Step3 Interface for controlling whether the tabcontrol is disabled while downloading
            Filter = "";
            if (System.IO.Directory.Exists(dataFolder) == false)
                System.IO.Directory.CreateDirectory(dataFolder);
            InitializeComponent();
            wbApplyOverrides.Navigate(navURL);
        }

        // Initializes the proper context for each of the steps onTabActivate
        private void tabInterface_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (e.OriginalSource is TabControl)
            {
                if (tabInterface.SelectedIndex > 0 && System.IO.File.Exists(ioPathLinkList) == false)
                    tabInterface.SelectedIndex = 0;
                else if (tabInterface.SelectedIndex > 1 && System.IO.File.Exists(ioPathLinkObjects) == false)
                    tabInterface.SelectedIndex = 1;
                else if (tabInterface.SelectedIndex == 4 && System.IO.File.Exists(ioPathHelpAbstraction) == false)
                    tabInterface.SelectedIndex = 3;
                else
                    switch (tabInterface.SelectedIndex + 1)
                    {
                        case 1: // Step 1: Extracting Navigation Links
                            navURL = urlHelpers.getHelpURL("4CEE5072-8817-4920-8A2D-7060F5E16547");
                            break;
                        case 2: // Step 2: Classify the extracted links
                            AllLinks.Clear();
                            var html = System.IO.File.ReadAllText(ioPathLinkList);
                            HAP.HtmlDocument doc = new HAP.HtmlDocument();
                            doc.LoadHtml(html);
                            var anchors = doc.DocumentNode.SelectNodes("//a").ToList();
                            foreach (var a in anchors)
                            {
                                var href = a.GetAttributeValue("href", "").ToUpper().Trim(' ', '?').Replace("GUID-", "").Replace("GUID=", "").Trim();
                                var title = a.InnerText.Replace("\n", "").Replace("\r", "").Replace("&gt;", ">").Replace("&lt;", "<").Trim();
                                AllLinks.Add(new LinkObject(title, href));
                            }
                            navURL = ioPathLinkList;
                            lbxInitNavLinks.ItemsSource = AllLinks;
                            break;
                        case 3: // Download the classified link conent      
                            isIdle = true;
                            InitializeDownloadVariables();
                            break;
                        case 4: // Parse of web help document content
                            InitializeDownloadVariables();
                            break;
                        case 5: // possibly some kind of rule system
                            CurrentLib = ioPathHelpAbstraction.UnPack<WebObjectLibrary>();
                            AllOverrides.Clear();
                            Filter = "";
                            if (System.IO.File.Exists(ioPathRuleOverrides) == true)
                                foreach (OverrideRule item in ioPathRuleOverrides.UnPack<List<OverrideRule>>())
                                    AllOverrides.Add(item);
                            tvApplyOverrides.DataContext = CurrentLib;
                            break;
                    }
            }
        }
        #endregion


        #region Tab: Step 1        
        //  Note: there is the potential to expose the navigation system through link click simulation as described by these posts:
        //        https://social.msdn.microsoft.com/Forums/en-US/7e7cbca8-918b-4a55-b7f3-eded904ae8da/simulate-click-and-input-form-in-wpf-webbrowser-on-outer-web-page
        //        https://stackoverflow.com/questions/20845140/add-reference-shdocvw-in-c-sharp-project-using-visual-c-sharp-2010-express
        
        /// This one event callback covers everything related to Step 1
        private void btnCollectNavElements_Click(object sender, RoutedEventArgs e)
        {
            var anchorList = new List<HAP.HtmlNode>();
            var doc = new HAP.HtmlDocument();
            var html = (wbCollectNavElements.Document as mshtml.HTMLDocument).documentElement.outerHTML;
            doc.LoadHtml(html);
            var nav = doc.DocumentNode.SelectNodes("//div").ToList().Find(p => p.HasClass("node-tree-container"));
            var liList = doc.DocumentNode.SelectNodes(nav.XPath + "//li");
            foreach (var li in liList)
            {
                var anchors = doc.DocumentNode.SelectNodes(li.XPath + "//a").ToList();
                if (li.HasClass("node") && anchors.Count == 1 && anchors[0].GetAttributeValue("href", "").Length >= 36)
                    anchorList.Add(anchors[0].ParentNode);
            }
            if (anchorList.Count >= 1)
            {
                System.IO.File.WriteAllText(ioPathLinkList, htmlGeneration.wrapContentIntoHtmlDocument(anchorList));
                tabInterface.SelectedIndex += 1;
            }
        }
        #endregion


        #region Tab: Step 2
        /// The is region covers most of the functionality, but the LinkObject is defined in /InterfaceUtilities/InterfaceObjects.cs
        private void btnInitNavLinks_Click(object sender, RoutedEventArgs e)
        {   
            List<LinkObject> validLinks = new List<LinkObject>();
            foreach (LinkObject item in lbxInitNavLinks.ItemsSource)
                if (item.category != linkCategory.NotUsed)
                    validLinks.Add(item);
            if (validLinks.Count >= 1)
            {
                validLinks.Pack(ioPathLinkObjects);
                tabInterface.SelectedIndex += 1;
            }
        }

        private void lbxInitNavLinks_PreviewMouseRightButtonDown(object sender, MouseButtonEventArgs e)
        {
            if (e.ChangedButton == MouseButton.Right)
                e.Handled = true;
        }

        private void lbxInitNavLinks_MenuItem_Click(object sender, RoutedEventArgs e)
        {
            if (lbxInitNavLinks.SelectedItems.Count >= 1)
            {
                linkCategory newValue = (linkCategory)Convert.ToInt32((sender as FrameworkElement).Tag);
                foreach (LinkObject item in lbxInitNavLinks.SelectedItems)
                    item.category = newValue;
            }
        }
        #endregion


        #region Tab: Step 3       
        /// Step 3 has a partial class that encapsulates the entire download process and is located in: /StepBehaviors/Step3.GuidDownloader.cs
        /// The LinkObject Class used by the DispatcherTimer is defined in /InterfaceUtilities/InterfaceObjects.cs
        private void btnContentDownload_Click(object sender, RoutedEventArgs e)
        {            
            int downloadSpeed = (int)sldContentDownload.Value * 250; // the sldContentDownload.Value is highly subjective to computer specs & internet connection
            isIdle = false;
            System.Windows.Threading.DispatcherTimer tmr = new System.Windows.Threading.DispatcherTimer();
            tmr.Interval = TimeSpan.FromMilliseconds(downloadSpeed);
            tmr.Tick += Tmr_Tick;
            tmr.Start();
        }
        #endregion


        #region Tab: Step 4
        /// These callbacks do represent all the interface behavior associated with Step 4
        /// The ScrapeDocument, WebObjectLibrary and all its sub-object Classes are defined in: /StepBehaviors/Step4.WebObjectLibrary.cs
        private void lbxScrapeContent_SelectedItemChanged(object sender, RoutedPropertyChangedEventArgs<object> e)
        {
            if (lbxScrapeContent.SelectedItem is LinkObject)
            {
                LinkObject obj = (LinkObject)lbxScrapeContent.SelectedItem;
                var filePath = dataFolder + Enum.GetName(linkCategory.NotUsed.GetType(), obj.category) + "\\" + obj.guid + ".html";
                if (System.IO.File.Exists(filePath) == true)
                    tbxScrapeContent.Text = new ScrapeDocument(filePath, obj).jsonString;
                else
                    tbxScrapeContent.Text = "Error: The local version of this GUID's content was not found";
            }
            else
                tbxScrapeContent.Text = "Null";
        }
        private void btnScrapeAllContent_Click(object sender, RoutedEventArgs e)
        {
            WebObjectLibrary ejoLib = new WebObjectLibrary();
            foreach (var key in CatagorizedLinks.Keys)
            {
                foreach (var link in CatagorizedLinks[key])
                {
                    var filePath = dataFolder + Enum.GetName(linkCategory.NotUsed.GetType(), link.category) + "\\" + link.guid + ".html";
                    if (System.IO.File.Exists(filePath) == true)
                    {
                        ScrapeDocument doc = new ScrapeDocument(filePath, link);
                        List<string> enums = new List<string>();
                        foreach (ejoHelpEntity item in doc.items)
                        {
                            switch (item.category)
                            {
                                case ejoCategory.OBJECT:
                                    if (ejoLib.objects.ContainsKey(item.id.ToLower()) == false)
                                        ejoLib.objects.Add(item.id.ToLower(), (ejoObject)item);
                                    break;
                                case ejoCategory.FUNCTION:
                                case ejoCategory.METHOD:
                                    var meth = (ejoFunction)item;
                                    if (doc.items.Count == 1 && ejoLib.functions.ContainsKey(item.id.ToLower()) == false)
                                        ejoLib.functions.Add(item.id.ToLower(), meth);
                                    else if (doc.items.Count >= 2 && ejoLib.ambiguousFunctions.ContainsKey(item.id.ToLower()) == false)
                                        ejoLib.ambiguousFunctions.Add(item.id.ToLower(), new List<ejoFunction>() { meth });
                                    else if (doc.items.Count >= 2 && ejoLib.ambiguousFunctions.ContainsKey(item.id.ToLower()) == true)
                                        ejoLib.ambiguousFunctions[item.id.ToLower()].Add(meth);
                                    foreach (ejoValueType val in meth.arguments.Concat(new[] { meth.returnType }).ToArray())
                                        foreach (var eId in val.enums)
                                            if (ejoLib.enumerators.ContainsKey(eId.ToLower()) == false && eId.Length >= 4 && eId.ToLower() != "vlax:true" && eId.ToLower() != "vlax:false")
                                                ejoLib.enumerators.Add(eId.ToLower(), item.id.ToLower());
                                    break;
                                case ejoCategory.PROPGETTER:
                                case ejoCategory.PROPSETTER:
                                    var func = (ejoFunction)item;
                                    if (ejoLib.functions.ContainsKey(item.id.ToLower()) == false)
                                        ejoLib.functions.Add(item.id.ToLower(), func);
                                    foreach (ejoValueType val in func.arguments.Concat(new[] { func.returnType }).ToArray())
                                        foreach (var eId in val.enums)
                                            if (ejoLib.enumerators.ContainsKey(eId.ToLower()) == false && eId.Length >= 4 && val.primitive == "enum")
                                                ejoLib.enumerators.Add(eId.ToLower(), item.id.ToLower());
                                    break;
                                case ejoCategory.DCLTILE:
                                    if (ejoLib.dclTiles.ContainsKey(item.id.ToLower()) == false)
                                        ejoLib.dclTiles.Add(item.id.ToLower(), (ejoTile)item);
                                    break;
                                case ejoCategory.DCLATT:
                                    if (ejoLib.dclAttributes.ContainsKey(item.id.ToLower()) == false)
                                        ejoLib.dclAttributes.Add(item.id.ToLower(), (ejoAttribute)item);
                                    break;
                                case ejoCategory.EVENT:
                                    if (ejoLib.events.ContainsKey(item.id.ToLower()) == false)
                                        ejoLib.events.Add(item.id.ToLower(), (ejoEvent)item);
                                    break;
                            }
                        }                        
                    }   
                }
            }
            ejoLib.Pack(ioPathHelpAbstraction);
            tabInterface.SelectedIndex += 1;
        }
        #endregion


        #region Tab: Step 5
        /// Step 5 has a partial class that encapsulates most of this OverrideRule process and is located in: /StepBehaviors/Step5.ApplyOverrides.cs
        /// The actuall OverrideRule Class is defined in: /InterfaceUtilities/InterfaceObjects.cs
        private void btnExportFinalAbstraction_Click(object sender, RoutedEventArgs e)
        {
            SaveFileDialog dlg = new SaveFileDialog()
            {
                Filter = "json files | *.json",
                DefaultExt = "json",
                InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.MyComputer),
                FileName = "webHelpAbstraction.json",
                OverwritePrompt = true,
                Title = "Export Help Abstraction"
            };
            if (dlg.ShowDialog() == true)
            {
                List<string> Errors = new List<string>();
                for (int i = 0; i < AllOverrides.Count; i++)
                {
                    try // neccessary evil so that rules can exist, but don't have to always be functional. This will handle testing of partial exports or potential legacy situations.
                    {
                        OverrideRule.findeOverrideTargetObject(CurrentLib, AllOverrides[i].fullSelectedPath).source.ApplyRule(AllOverrides[i]);
                    }
                    catch (Exception)
                    {
                        Errors.Add("Error@Index: " + i.ToString().PadLeft(3, '0') + " ON: " + AllOverrides[i].id + "[" + AllOverrides[i].targetProperty + "]");
                    }
                }                
                CurrentLib.Pack(dlg.FileName);
                CurrentLib = ioPathHelpAbstraction.UnPack<WebObjectLibrary>();
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("Extraction Completed: " + (Errors.Count == 0 ? "without errors" : "with override json errors!"));
                sb.AppendLine("");
                sb.AppendLine("Note that unless you've specifically overwritten the internal (pre-override) version, then this dialog will not show show the exported version");
                sb.AppendLine("");
                sb.AppendLine("");
                foreach (string err in Errors)
                    sb.Append(err);
                MessageBox.Show(sb.ToString(), "Information", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }
        #endregion


        
    }
}
