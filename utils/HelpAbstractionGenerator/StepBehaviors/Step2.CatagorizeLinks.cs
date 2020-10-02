using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Security.Policy;
using System.Security.Principal;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Controls;
using HAP = HtmlAgilityPack;

namespace HelpAbstractionGenerator
{
    public static class Step2
    {
        public static List<LinkObject> getLinkListItems(string filePath)
        {
            var result = new List<LinkObject>();
            var html = System.IO.File.ReadAllText(filePath);
            HAP.HtmlDocument doc = new HAP.HtmlDocument();
            doc.LoadHtml(html);
            var anchors = doc.DocumentNode.SelectNodes("//a").ToList();
            foreach (var a in anchors)
            {
                var href = a.GetAttributeValue("href", "").ToUpper().Trim('?').Trim().Replace("GUID-", "").Replace("GUID=", "").Trim();
                var title = a.InnerText.Trim().Replace("\r\n", "").Replace("\n", "").Replace("\r", "").Replace("&gt;", ">").Replace("&lt;", "<");
                result.Add(new LinkObject(title, href));
            }
            return result;
        }

        public static void applyCategoryToSelectedItems(ListView lv, object category)
        {
            linkCategory newValue = (linkCategory)Convert.ToInt32(category);
            foreach (LinkObject item in lv.SelectedItems)
            {
                item.category = newValue;
            }
        }

        public static void saveCatagorizedLinkTargets(ListView lv, string filePath)
        {
            List<LinkObject> validLinks = new List<LinkObject>();
            foreach (LinkObject item in lv.ItemsSource)
                if (item.category != linkCategory.NotUsed)
                    validLinks.Add(item);
            validLinks.Pack(filePath);
        }
    }


    

       
}
