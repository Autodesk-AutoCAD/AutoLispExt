using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Net.Cache;
using System.Net.Http;
using System.Runtime.CompilerServices;
using System.Text;
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
using System.Xaml.Schema;
using HAP = HtmlAgilityPack;
using HMS = mshtml;
using SHD = SHDocVw;

namespace HelpAbstractionGenerator
{
    

    public partial class MainWindow : Window
    {
        public enum tickTask
        {
            navigate1,
            document2,
            navigate2,
            document1,
            powerdown,
        }

        linkCategory currentKey = linkCategory.NotUsed;
        int currentIndex = -1;
        List<linkCategory> AllKeys;
        string b1path, b2path;
        tickTask status = tickTask.navigate1;
        LinkObject b1Content, b2Content;

        public void InitializeDownloadVariables()
        {
            CatagorizedLinks.Clear();          
            foreach (LinkObject link in ioPathLinkObjects.UnPack<List<LinkObject>>())
            {
                if (link.category != linkCategory.NotUsed)
                {
                    if (CatagorizedLinks.ContainsKey(link.category) == false)
                        CatagorizedLinks.Add(link.category, new List<LinkObject>());
                    CatagorizedLinks[link.category].Add(link);
                }
            }
            AllKeys = CatagorizedLinks.Keys.ToList();
            currentKey = AllKeys[0];
            currentIndex = 0;
            // initialize a normalize interface starting state
            isIdle = true;
            wbDownloader1.Navigate("http://www.bing.com");
            wbDownloader2.Navigate("http://www.bing.com");
        }

        private void Navigator(ref bool searching, int ContentTarget)
        {
            if (currentIndex < CatagorizedLinks[currentKey].Count)
            {
                string dir = dataFolder + Enum.GetName(linkCategory.NotUsed.GetType(), CatagorizedLinks[currentKey][currentIndex].category) + "\\";
                string path = dir + CatagorizedLinks[currentKey][currentIndex].guid + ".html";
                if (System.IO.Directory.Exists(dir) == false)
                    System.IO.Directory.CreateDirectory(dir);
                if (System.IO.File.Exists(path) == false || new System.IO.FileInfo(path).Length <= 3000) // verifying its not a near empty html file
                {
                    if (ContentTarget == 1)
                    {
                        b1path = path;
                        b1Content = CatagorizedLinks[currentKey][currentIndex];
                        wbDownloader1.Navigate(b1Content.url);
                    }
                    else
                    {
                        b2path = path;
                        b2Content = CatagorizedLinks[currentKey][currentIndex];
                        wbDownloader2.Navigate(b2Content.url);
                    }
                    searching = false;
                }
                else
                    currentIndex++;
            }
            else
            {
                if (AllKeys.IndexOf(currentKey) + 1 < AllKeys.Count)
                {
                    currentKey = AllKeys[AllKeys.IndexOf(currentKey) + 1];
                    currentIndex = 0;
                }
                else
                {
                    if (ContentTarget == 1)
                        b1Content = null;
                    else
                        b2Content = null;
                    searching = false;
                }   
            }
        }

        private void DownloadContent(WebBrowser wb, string path)
        {
            var doc = new HAP.HtmlDocument();            
            var str = (wb.Document as mshtml.HTMLDocument).documentElement.outerHTML;
            try
            {
                doc.LoadHtml(str);
                // Autodesk did an excelent job of making sure the stuff we care about resides in <article> tags
                System.IO.File.WriteAllText(path, htmlGeneration.wrapContentIntoHtmlDocument(doc.DocumentNode.SelectNodes("//article").ToList()));
            }
            catch (Exception ex) { Debugger.Log(1, path, ex.Message); }
        }

        private void Tmr_Tick(object sender, EventArgs e)
        {            
            bool searching = true; // this is helping to manage downloading pages we already have. Stays true until the next guid was a legit missing or very tiny file
            switch (status)
            {
                case tickTask.navigate1:                    
                    do
                    {
                        Navigator(ref searching, 1);
                    } while (searching);
                    currentIndex++;
                    status = b1Content == null ? tickTask.powerdown : tickTask.document2;
                    break;
                case tickTask.document2:
                    if (b2Content != null)
                        DownloadContent(wbDownloader2, b2path);
                    status = tickTask.navigate2;
                    break;
                case tickTask.navigate2:
                    do
                    {
                        Navigator(ref searching, 2);
                    } while (searching);
                    currentIndex++;
                    status = b2Content == null ? tickTask.powerdown : tickTask.document1;
                    break;
                case tickTask.document1:
                    if (b1Content != null)
                        DownloadContent(wbDownloader1, b1path);
                    status = tickTask.navigate1;
                    break;
                case tickTask.powerdown:
                    (sender as System.Windows.Threading.DispatcherTimer).Stop();
                    var remaining = b1Content ?? b2Content;
                    if (b1Content != null)
                        DownloadContent(wbDownloader1, b1path);
                    if (b2Content != null)
                        DownloadContent(wbDownloader2, b2path);
                    isIdle = true;
                    tabInterface.SelectedIndex += 1;
                    break;
            }
        }
    }
}
