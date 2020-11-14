using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;
using System.Windows.Controls;
using System.Collections.ObjectModel;
using System.Linq;

namespace autolispext.i18.helper
{
    public static class extensions
    {
        public static tsFileReference getValue(this WeakReference<tsFileReference> obj)
        {
            tsFileReference result = null;
            obj.TryGetTarget(out result);
            return result;
        }

        public static TreeViewItem clone(this TreeViewItem tvi)
        {
            return new TreeViewItem()
            {
                Header = tvi.Header,
                Tag = tvi.Tag,
                ItemsSource = (tvi.ItemsSource as IList<TreeViewItem>).Select(item => item.clone()).ToList()
            };
        }

        public static string encodeTranslateValue(this string str)
        {
            return str.Replace("%", "%25").Replace(Environment.NewLine, "%0A").Replace(" ", "%20").Replace("+", "%2B").Replace(",", "%2C").Replace("/", "%2F")
                .Replace("#", "%23").Replace("$", "%24").Replace("&", "%26").Replace("@", "%40")
                .Replace("=", "%3D").Replace("?", "%3F");
        }
    }


    public static class Serializer
    {
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
