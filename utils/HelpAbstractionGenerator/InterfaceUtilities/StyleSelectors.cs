using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;

namespace HelpAbstractionGenerator
{
    public class LinkObjectTypeItemStyleSelector : StyleSelector
    {
        public override Style SelectStyle(object item, DependencyObject container)
        {
            ListView listView = ItemsControl.ItemsControlFromItemContainer(container) as ListView;
            LinkObject link = item as LinkObject;
            if (link == null)
                return listView.FindResource("DefaultItemStyle") as Style;
            else
            {
                switch (link.category)
                {
                    case linkCategory.Object: return listView.FindResource("ObjectStyle") as Style;
                    case linkCategory.Method: return listView.FindResource("MethodStyle") as Style;
                    case linkCategory.Property: return listView.FindResource("PropertyStyle") as Style;
                    case linkCategory.Function: return listView.FindResource("FunctionStyle") as Style;
                    case linkCategory.DclTile: return listView.FindResource("DclTileStyle") as Style;
                    case linkCategory.DclAttribute: return listView.FindResource("DclAttributeStyle") as Style;
                    case linkCategory.Event: return listView.FindResource("EventStyle") as Style;
                    default: return listView.FindResource("DefaultItemStyle") as Style;
                }
            }
        }
    }
}
