using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;

namespace HelpAbstractionGenerator
{
    public class FunctionTemplateSelector : DataTemplateSelector
    {
        public override DataTemplate SelectTemplate(object item, DependencyObject container)
        {
            FrameworkElement elemnt = container as FrameworkElement;
            if (item == null)
                return null;
            if (item is KeyValuePair<string, List<ejoFunction>>)
                return elemnt.FindResource("ambFuncTemplate") as DataTemplate;
            else if (item is KeyValuePair<string, ejoFunction>)
                return elemnt.FindResource("libFuncTemplate") as DataTemplate;
            else if (item is ejoFunction)
                return elemnt.FindResource("lstFuncTemplate") as DataTemplate;
            else
                return elemnt.FindResource("libDictKeyTemplate") as DataTemplate;
        }
    }
}
