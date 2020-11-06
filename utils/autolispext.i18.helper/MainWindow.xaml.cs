using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace autolispext.i18.helper
{
    public static class Shared
    {
        public static string rootDir = "";
        public static string srcDir = "";
        public static string i18Dir = "";
        public static List<string> codes = new List<string>();
    }
    
    public partial class MainWindow : Window
    {        
        ObservableCollection<tsFileReference> references = new ObservableCollection<tsFileReference>();
        ObservableCollection<deleteReference> deletes = new ObservableCollection<deleteReference>();

        public List<TreeViewItem> rootSourceNodes = new List<TreeViewItem>();
        public List<TreeViewItem> rootLanguageNodes = new List<TreeViewItem>();

        private List<TreeViewItem> getRootNodes(string dir)
        {
            string[] excludes = new string[] { "\\node_modules", "\\.git", "\\out", "\\utils", "\\vendor" };
            List<TreeViewItem> result = new List<TreeViewItem>();
            foreach (var d in System.IO.Directory.GetDirectories(dir))
            {
                System.IO.DirectoryInfo di = new System.IO.DirectoryInfo(d);
                if (excludes.Contains(di.FullName.Replace(Shared.rootDir, "")) == false)
                {
                    TreeViewItem stvi = new TreeViewItem();
                    stvi.Header = di.Name;
                    stvi.Tag = di.FullName;
                    stvi.ItemsSource = getRootNodes(di.FullName);
                    result.Add(stvi);
                }
            }
            return result;
        }

        public MainWindow()
        {
            SaveFileDialog dlg = new SaveFileDialog();
            dlg.FileName = "this.folder";
            dlg.Title = "Simulated save to select extension root folder";            
            if (dlg.ShowDialog() == true)
            {
                Shared.rootDir = System.IO.Path.GetDirectoryName(dlg.FileName).Replace('/', '\\').TrimEnd('\\');
                rootSourceNodes = getRootNodes(Shared.rootDir);
                InitializeComponent();
            }
            else
            {
                this.Close();
            }
        }

        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            grdConfig.Visibility = Visibility.Visible;
            grdAuditExisting.Visibility = Visibility.Collapsed;
            grdWorkspace.Visibility = Visibility.Collapsed;
            tvLanguageRoot.ItemsSource = rootSourceNodes;
            tvSourceRoot.ItemsSource = rootSourceNodes.Select(p => p.clone()).ToList();
        }

        /// Need to make another GRiD that is dedicated to deleting json entries that do not have a localize reference
        private void btnUseConfig_Click(object sender, RoutedEventArgs e)
        {
            Shared.srcDir = (tvSourceRoot.SelectedItem as TreeViewItem).Tag.ToString();
            Shared.i18Dir = (tvLanguageRoot.SelectedItem as TreeViewItem).Tag.ToString();
            Shared.codes.Clear();
            grdConfig.Visibility = Visibility.Collapsed;
            grdAuditExisting.Visibility = Visibility.Collapsed;
            grdWorkspace.Visibility = Visibility.Visible;
            foreach (MenuItem item in mnuLangs.Items)
            {
                if (item.IsChecked == true)
                    Shared.codes.Add(item.Header.ToString());
            }
            foreach (var path in System.IO.Directory.GetFiles(Shared.srcDir, "*.ts", System.IO.SearchOption.AllDirectories))
            {
                var robj = new tsFileReference(path);
                if (robj.References.Keys.Count > 0)
                    references.Add(robj);
            }
            lbxTsFiles.ItemsSource = references;
        }

        private void btnSaveValues_Click(object sender, RoutedEventArgs e)
        {
            foreach (var item in references)
            {
                foreach (var key in item.References.Keys)
                {
                    foreach (var entry in item.References[key])
                    {
                        item.jsonFiles[entry.jsonPath][entry.key] = entry.cValue;
                    }
                }
                foreach (var file in item.jsonFiles.Keys)
                {
                    item.jsonFiles[file].Pack(file);
                }
            }

            
            /// This was abandoned because its clearly not a problem
            /// The original purpose was to detect *.JSON references that no longer appeared in the *.TS files.
            //foreach (var item in references)
            //{
            //    var usedKeys = item.References.Keys;
            //    foreach (var file in item.jsonFiles.Keys)
            //    {
            //        var entries = file.UnPack<Dictionary<string, string>>();
            //        foreach (var possible in entries.Keys)
            //        {
            //            if (usedKeys.Contains(possible) == false)
            //            {
            //                deletes.Add(new deleteReference(file, possible));
            //            }
            //        }
            //    }
            //}
            //itemDeleteEditor.ItemsSource = deletes;
            //grdConfig.Visibility = Visibility.Collapsed;
            //grdWorkspace.Visibility = Visibility.Collapsed;
            //grdAuditExisting.Visibility = Visibility.Visible;
            MessageBox.Show("Operation Complete, you can close this dialog unless you have more work to do\n\nIt is suggested you re-open it if you want to double check the results.");
        }


        private void cmiTranslateClick_Click(object sender, RoutedEventArgs e)
        {
            var mi = (MenuItem)sender;
            if (lbxLocalRefs.SelectedItem != null)
            {
                var vals = (KeyValuePair<string, List<localizeReference>>)lbxLocalRefs.SelectedItem;
                var targ = vals.Value.Find(p => p.countryCode == "enu");
                launchBrowserTranslater(mi.Tag.ToString(), targ.cValue);
            }
            else
            {
                launchBrowserTranslater(mi.Tag.ToString(), "");
            }
            
            // @"https://translate.google.com/#view=home&op=translate&sl=en&tl=" + Tag + @"&text=what%20do%20I%20do"
            
        }


        private void btnTranslate_Click(object sender, RoutedEventArgs e)
        {
            (sender as Button).ContextMenu.PlacementTarget = (Button)sender;
            (sender as Button).ContextMenu.IsOpen = true;
        }
        private void ButtonContextMenu_Opened_DoPlacement(object sender, RoutedEventArgs e)
        {
            var cm = (ContextMenu)sender;
            var obj = (Button)cm.PlacementTarget;
            if (obj.Content.ToString() != "Save")
            {
                var pt = obj.PointToScreen(new Point(0, 0));
                cm.Placement = System.Windows.Controls.Primitives.PlacementMode.Absolute;
                cm.PlacementRectangle = new Rect(pt.X + obj.ActualWidth - cm.ActualWidth, pt.Y + obj.ActualHeight, obj.ActualWidth, obj.ActualHeight);
            }
        }

        public void launchBrowserTranslater(string country, string value)
        {
            string url = @"https://translate.google.com/#view=home&op=translate&sl=en&tl=" + country + @"&text=" + value.encodeTranslateValue();
            url = url.Replace("&", "^&");
            Process.Start(new ProcessStartInfo("cmd", $"/c start {url}") { CreateNoWindow = true });
        }


        private void btnDeleteValues_Click(object sender, RoutedEventArgs e)
        {

        }

    }

    public class deleteReference
    {
        public string name { get; set; }
        public string jsonPath { get; set; }
        public bool flag { get; set; }
        public string displayPath { get { return System.IO.Path.GetFileName(jsonPath); } }

        public deleteReference(string json, string key)
        {
            jsonPath = json;
            name = key;
        }
    }

    public class localizeReference
    {
        public WeakReference<tsFileReference> Parent;
        public string key { get; set; }
        public string cValue { get; set; }
        public string jsonPath { get; set; }
        public string countryCode { get; set; }
        public bool hasFile { get { return System.IO.File.Exists(jsonPath); } }
        
        public localizeReference(WeakReference<tsFileReference> parent, string country, string json, string code, string value)
        {
            jsonPath = json;
            Parent = parent;
            key = code;
            cValue = value;
            countryCode = country;
        }

        

        public override string ToString()
        {
            return key;
        }
    }

    public class tsFileReference
    {
        public string filePath { get; set; }
        public string displayPath { get { return filePath.Replace(Shared.srcDir, ""); } }
        public Dictionary<string, List<localizeReference>> References { get; set; } = new Dictionary<string, List<localizeReference>>();
        public Dictionary<string, Dictionary<string, string>> jsonFiles = new Dictionary<string, Dictionary<string, string>>();
        public tsFileReference(string tspath)
        {
            filePath = tspath;
            List<string> Lines = System.IO.File.ReadAllLines(tspath).ToList();
            foreach (var lin in Lines)
            {
                var parts = lin.Split(new string[] { "AutoLispExt.localize(" }, StringSplitOptions.None).ToList();
                if (parts.Count > 1)
                {
                    bool stop = filePath.ToUpper().Contains("URI");
                    int endindex = parts[1].IndexOf(',') == -1 ? parts[1].IndexOf(')') : parts[1].IndexOf(',');
                    var localContent = parts[1].Substring(1, endindex - 1);
                    //parts = localContent.Split(',').ToList();
                    //if (parts.Count > 1)
                    localContent = localContent.Trim().Trim('\'').Trim('\"').Trim('\'').Trim('\"');
                    foreach (string langid in Shared.codes)
                    {
                        string expected = Shared.i18Dir + "\\" + langid + "\\out" + displayPath.Substring(0, displayPath.Length - 3) + ".i18n.json";
                        if (jsonFiles.ContainsKey(expected) == false && System.IO.File.Exists(expected) == true)
                            jsonFiles.Add(expected, expected.UnPack<Dictionary<string, string>>());
                        else if (jsonFiles.ContainsKey(expected) == false)
                            jsonFiles.Add(expected, new Dictionary<string, string>());

                        string cv = jsonFiles[expected].ContainsKey(localContent) ? jsonFiles[expected][localContent] : "";

                        if (References.ContainsKey(localContent) == false)
                            References.Add(localContent, new List<localizeReference>());

                        if (References[localContent].Count != Shared.codes.Count)
                            References[localContent].Add(new localizeReference(new WeakReference<tsFileReference>(this), langid, expected, localContent, cv));
                    }
                }
            }

        }

        public override string ToString()
        {
            return displayPath;
        }
    }





    
}
