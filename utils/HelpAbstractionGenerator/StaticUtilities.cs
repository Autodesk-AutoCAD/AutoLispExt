using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using System.Text.RegularExpressions;
using HAP = HtmlAgilityPack;
using System.Windows.Controls;
using System.Runtime.CompilerServices;

namespace HelpAbstractionGenerator
{
    public static class htmlGeneration
    {
        public static string getGeneralizedHtmlBodyHeader()
        {
            return @"<!DOCTYPE html><html><head><meta http-equiv='content-type' content='text/html;charset=UTF-8'><title>AdskHelp</title></head><body>" + Environment.NewLine;
        }

        public static string getGeneralizedHtmlBodyFooter()
        {
            return Environment.NewLine + @"</body></html>";
        }

        public static string wrapContentIntoHtmlDocument(string bodyContent)
        {
            return getGeneralizedHtmlBodyHeader() + bodyContent + getGeneralizedHtmlBodyFooter();
        }

        public static string wrapContentIntoHtmlDocument(List<HAP.HtmlNode> bodyContent)
        {
            return getGeneralizedHtmlBodyHeader() + string.Join(Environment.NewLine, bodyContent.Select(p => p.OuterHtml)) + getGeneralizedHtmlBodyFooter();
        }
    }



    public static class urlHelpers
    {
        public static string getHelpURL(string guid)
        {
            return getDefaultHelpURL() + "?guid=GUID-" + guid;
        }
        public static string getDefaultHelpURL()
        {
            return "https://help.autodesk.com/view/OARX/2021/" + System.Globalization.CultureInfo.CurrentCulture.ThreeLetterWindowsLanguageName + "/";
        }
    }
    
    

    public static class RegexExtensions
    {
        // Creates LINQ Find capabilities for the Match Collection
        public static Match Find(this MatchCollection enumerable, Predicate<Match> compareMethod)
        {
            foreach (Match item in enumerable)
                if (compareMethod(item))
                    return item;
            return default(Match);
        }


        public static string getMatchString(this MatchCollection col)
        {
            string result = "";
            foreach (Match item in col)
                result += item.Value;
            return result;
        }
    }



    public static class StringExtensions
    {
        private static Regex rgxClean = new Regex(@"\s+");
        public static string Normalization(this string str)
        {
            return rgxClean.Replace(str, " ").Replace("&gt;", ">").Replace("&lt;", "<").Trim();
        }


        private static Regex rgxLetter = new Regex(@"[A-Za-z]{1,}");
        public static string getLetters(this string str, bool upper = true)
        {
            if (upper)
                return rgxLetter.Matches(str.ToUpper()).getMatchString();
            else
                return rgxLetter.Matches(str).getMatchString();
        }


        private static Regex rgxOptional = new Regex(@"[A-Za-z0-9\[\]]{1,}");
        public static bool isMarkedOptional(this string search, string within)
        {
            within = rgxOptional.Matches(within.ToUpper()).getMatchString();
            bool isHardMatch = within.Contains("[" + search.ToUpper().Trim() + "]");
            bool isSoftMatch = within.Contains("[" + search.ToUpper().Trim());
            return isHardMatch || search.ToUpper().Trim().StartsWith("[") || isSoftMatch;
        }


        // very similar to LastIndexOf() but works with multiple options and will ignore case
        public static int findIndexAfter(this string str, bool ignoreCase, params string[] values)
        {
            int result = 0;
            if (ignoreCase == true)
            {
                str = str.ToUpper();
                values = values.Select(p => p.ToUpper()).ToArray();
            }
            foreach (var item in values)
            {
                int ci = str.Substring(result).IndexOf(item);
                if (ci != -1)
                    result = result + ci + item.Length;
            }
            return result;
        }


        public static List<string> splitByAnyChar(this string str, string chars, bool removeBlanks = true)
        {
            if (removeBlanks == true)
                return str.Split(chars.ToCharArray()).Where(p => p.Trim() != "").ToList();
            else
                return str.Split(chars.ToCharArray()).ToList();
        }

        // Kind of like IEnumerable<string>.Contains but flipped to use the string as the thing thats searched
        public static bool Contains(this string searchIn, IEnumerable<string> searchFor)
        {
            return searchFor.All(p => searchIn.Contains(p));
        }

        // Used to avoid some unneccessary inline casting
        public static string getPropStringValue(this object obj, string propertyName)
        {
            var prop = obj.GetType().GetProperty(propertyName);
            return prop == null ? "" : prop.GetValue(obj).ToString();
        }
    }



    public static class NodeExtensions
    {
        // solved a problem with non-tag elements being (sometimes) present in the Autodesk documentation. Extended functionality if you know all the stuff you don't want.
        public static HAP.HtmlNode nextRealSibling(this HAP.HtmlNode cnode, params string[] excluding)
        {
            excluding = excluding.Append("#text").ToArray();
            while (true)
            {
                if (cnode.NextSibling == null) return null;
                else if (excluding.Contains(cnode.NextSibling.Name) == true) cnode = cnode.NextSibling;
                else return cnode.NextSibling;
            }
        }

        // simple shortcut extensively used with the SelectNodes/SelectSingleNode meths to ensure the XPath stays contextual to the entire <article>
        public static HAP.HtmlNode getDoc(this HAP.HtmlNode node)
        {
            return node == null ? null : node.OwnerDocument.DocumentNode;
        }
    }



    public static class Serializer
    {
        public static string toJSON(this object obj, Formatting fmat = Formatting.Indented)
        {
            return JsonConvert.SerializeObject(obj, new JsonSerializerSettings() { NullValueHandling = NullValueHandling.Include, Formatting = fmat });
        }

        public static void Pack(this object obj, string path)
        {
            JsonSerializer ser = new JsonSerializer();
            ser.NullValueHandling = NullValueHandling.Include;
            ser.Formatting = Formatting.Indented;
            using (System.IO.StreamWriter sw = new System.IO.StreamWriter(path))
            {
                using (JsonWriter jw = new JsonTextWriter(sw))
                {
                    ser.Serialize(jw, obj);
                }
            }
        }
        public static T UnPack<T>(this string path)
        {
            if (System.IO.File.Exists(path) == true)
            {
                JsonSerializer ser = new JsonSerializer();
                ser.NullValueHandling = NullValueHandling.Include;
                using (System.IO.StreamReader sw = new System.IO.StreamReader(path))
                {
                    using (JsonTextReader jw = new JsonTextReader(sw))
                    {
                        return ser.Deserialize<T>(jw);
                    }
                }
            }
            else
            {
                return JsonConvert.DeserializeObject<T>(path);
            }

        }
    }
}
