using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Controls;
using System.Windows.Interop;
using HAP = HtmlAgilityPack;

namespace HelpAbstractionGenerator
{
    public static class Step1
    {
        public static void collectNavigationLinks(WebBrowser wb, string savePath)
        {
            var anchorList = new List<HAP.HtmlNode>();
            var doc = new HAP.HtmlDocument();            
            var html = (wb.Document as mshtml.HTMLDocument).documentElement.outerHTML;
            doc.LoadHtml(html);
            var nav = doc.DocumentNode.SelectNodes("//div").ToList().Find(e => e.HasClass("node-tree-container"));
            var liList = nav.SelectNodes(nav.XPath + "//li");
            foreach (var li in liList)
            {
                var anchors = li.SelectNodes(li.XPath + "//a").ToList();
                if (li.HasClass("node") && anchors.Count == 1 && anchors[0].GetAttributeValue("href", "").Length >= 36)
                    anchorList.Add(anchors[0].ParentNode);
            }
            System.IO.File.WriteAllText(savePath, Helpers.htmlGeneration.wrapContentIntoHtmlDocument(anchorList));
        }
    }
}
