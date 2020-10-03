using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows;

namespace HelpAbstractionGenerator
{
    public class OverrideRule : INotifyPropertyChanged
    {
        #region Infrastructure
        public event PropertyChangedEventHandler PropertyChanged;
        private void NotifyPropertyChanged(string propertyName = "") { PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName)); }
        private Dictionary<string, object> _vals = new Dictionary<string, object>();
        private object FindValue(string key) { return (_vals.ContainsKey(key) == true) ? _vals[key] : null; }
        private void ApplyValue(string key, object val) { if (_vals.ContainsKey(key) == false) { _vals.Add(key, null); } _vals[key] = val; NotifyPropertyChanged(key); }
        #endregion

        public string id { get { return (string)FindValue(nameof(id)); } set { ApplyValue(nameof(id), value); } }
        public string notes { get { return (string)FindValue(nameof(notes)); } set { ApplyValue(nameof(notes), value); } }
        public string fullSelectedPath { get { return (string)FindValue(nameof(fullSelectedPath)); } set { ApplyValue(nameof(fullSelectedPath), value); } }
        public string targetProperty { get { return (string)FindValue(nameof(targetProperty)); } set { ApplyValue(nameof(targetProperty), value); } }
        public string jsonValue { get { return (string)FindValue(nameof(jsonValue)); } set { ApplyValue(nameof(jsonValue), value); } }

        public OverrideRule() { }

        public static OverrideRule Create(WebObjectLibrary lib, string path)
        {            
            var context = findeOverrideTargetObject(lib, path);
            object cObj = context.source;
            if (context.subPath[0] == "id" || context.subPath[0] == "category")
            {
                MessageBox.Show("The 'id' and 'category' types are now allowed to be overridden", "Invalid Request", MessageBoxButton.OK, MessageBoxImage.Error);
                return null;
            }   
            else
            {
                /// Decided these objects really are not deep enough to drill down this much
                //foreach (string prop in context.subPath)
                //{
                //    if (cObj.GetType().IsArray)
                //    {   
                //        int index = Convert.ToInt32(prop.TrimStart('[').TrimEnd(']'));
                //        cObj = (cObj as object[])[index];
                //    }
                //    else
                //        cObj = cObj.GetType().GetProperty(prop).GetValue(cObj);
                //}

                return new OverrideRule()
                {
                    fullSelectedPath = path,
                    targetProperty = context.subPath.First(),
                    id = context.source.id,
                    jsonValue = cObj.GetType().GetProperty(context.subPath[0]).GetValue(cObj).toJSON(Newtonsoft.Json.Formatting.Indented),
                    notes = "Why?"
                };
            }
        }

        public static (ejoHelpEntity source, string[] subPath) findeOverrideTargetObject(WebObjectLibrary lib, string fullPath)
        {
            string[] points = fullPath.Split(',');
            ejoHelpEntity ent = null;
            int skipQty = 2;
            switch (points[0])
            {
                case nameof(lib.dclAttributes): ent = lib.dclAttributes[points[1]]; break;
                case nameof(lib.dclTiles): ent = lib.dclTiles[points[1]]; break;
                case nameof(lib.events): ent = lib.events[points[1]]; break;
                case nameof(lib.functions): ent = lib.functions[points[1]]; break;
                case nameof(lib.objects): ent = lib.objects[points[1]]; break;
                case nameof(lib.ambiguousFunctions):
                    ent = lib.ambiguousFunctions[points[1]][Convert.ToInt32(points[2].Substring(1, 1))];
                    skipQty = 3;
                    break;
            }
            return (ent, points.Skip(skipQty).ToArray());
        }
    }











    public enum linkCategory
    {
        Object = 0,
        Method = 1,
        Property = 2,
        Function = 4,
        DclTile = 6,
        DclAttribute = 7,
        Event = 8,
        NotUsed = 99
    }

    public class LinkObject : INotifyPropertyChanged
    {
        #region Infrastructure
        public event PropertyChangedEventHandler PropertyChanged;
        private void NotifyPropertyChanged(string propertyName = "") { PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName)); }
        private Dictionary<string, object> _vals = new Dictionary<string, object>();
        private object FindValue(string key) { return (_vals.ContainsKey(key) == true) ? _vals[key] : null; }
        private void ApplyValue(string key, object val) { if (_vals.ContainsKey(key) == false) { _vals.Add(key, null); } _vals[key] = val; NotifyPropertyChanged(key); } 
        #endregion

        public string guid { get { return (string)FindValue(nameof(guid)); } set { ApplyValue(nameof(guid), value); } }
        public string title { get { return (string)FindValue(nameof(title)); } set { ApplyValue(nameof(title), value); } }
        public linkCategory category { get { return (linkCategory)FindValue(nameof(category)); } set { ApplyValue(nameof(category), value); } }
        public string url { get { return urlHelpers.getHelpURL(guid); } set { } }

        public LinkObject() { }
        public LinkObject(string _title, string _guid, linkCategory _cat = linkCategory.NotUsed)
        { 
            guid = _guid; title = _title; category = _cat;
            string searchStr = title.getLetters();
            if (_cat == linkCategory.NotUsed)
            {
                if (searchStr.Contains("ATTRIBUTEDCL"))
                    category = linkCategory.DclAttribute; 
                else if (searchStr.Contains("TILEDCL"))
                    category = linkCategory.DclTile;
                else if (searchStr.Contains("METHODACTIVEX"))
                    category = linkCategory.Method;
                else if (searchStr.Contains("EVENTACTIVEX"))
                    category = linkCategory.Event;
                else if (searchStr.Contains("PROPERTYACTIVEX"))
                    category = linkCategory.Property;
                else if (searchStr.Contains("OBJECTACTIVEX") || searchStr.Contains("COLLECTIONACTIVEX") || searchStr.Contains("INTERFACEACTIVEX"))
                    category = linkCategory.Object;
                else if (searchStr.Contains("AUTOLISP") && title.Split('(').First().Trim().Contains(" ") == false)
                    category = linkCategory.Function;
            }
        }

        public override string ToString() { return title; }
    }
}
