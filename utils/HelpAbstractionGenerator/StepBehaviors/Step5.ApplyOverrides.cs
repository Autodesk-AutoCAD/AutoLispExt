using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Input;
using System.Windows.Media;


namespace HelpAbstractionGenerator
{
    public partial class MainWindow : Window
    {
        #region Library (left) Panel
        private void cmbOverridesFilterType_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            ApplyUserFilter(cmbOverridesFilterType?.SelectedItem?.getPropStringValue("Content"), Filter.ToUpper());
        }
        private void btnOverridesFilterClear_Click(object sender, RoutedEventArgs e)
        {
            Filter = "";
        }
        private string ApplyUserFilterGetObjValue(string propTarget, ejoHelpEntity obj)
        {
            propTarget = propTarget.getLetters(true);
            Type t = obj.GetType();
            switch (propTarget)
            {
                case "ATTRIBUTES": 
                case "DESCRIPTION":
                case "PLATFORMS":
                case "SIGNATURE":
                    PropertyInfo basicProp = t.GetProperties().ToList().Find(p => p.Name.ToUpper() == propTarget);
                    return (basicProp != null) ? basicProp.GetValue(obj).ToString().ToUpper() : "";
                case "METHODS":
                case "PROPERTIES":
                case "VALIDOBJECTS":
                    PropertyInfo arrayProp = t.GetProperties().ToList().Find(p => p.Name.ToUpper() == propTarget);
                    if (arrayProp != null)
                        return string.Join(", ", (string[])arrayProp.GetValue(obj)).ToUpper();
                    else
                        return "";
                case "ENUMS":
                    if (obj is ejoAttribute)
                        return (obj as ejoAttribute).valueType.getUpperCaseSearchString(null);
                    else if (obj is ejoFunction)
                        return string.Join(", ", (obj as ejoFunction).arguments.Select(a => a.getUpperCaseSearchString(null))) + " " + (obj as ejoFunction).returnType.getUpperCaseSearchString(null);
                    else
                        return "";
                case "IDROOT": return obj.id.ToUpper();
                default: // "SIGNATURERETURN"
                    string result = t.GetProperty("signature") == null ? "" : t.GetProperty("signature").GetValue(obj).ToString().ToUpper() + " ";
                    result += t.GetProperty(nameof(ejoFunction.returnType)) == null ? "" : t.GetProperty(nameof(ejoFunction.returnType)).GetValue(obj).ToString().ToUpper() + " ";
                    result += t.GetProperty(nameof(ejoAttribute.valueType)) == null ? "" : t.GetProperty(nameof(ejoAttribute.valueType)).GetValue(obj).ToString().ToUpper() + " ";
                    return result.Trim();
            }   
        }
        
        private void ApplyUserFilter(string propTarget, string ucStr)
        {   
            if (CurrentLib != null)
            {
                var criteria = ucStr.Trim().Split(',');              
                foreach (ejoAttribute item in CurrentLib.dclAttributes.Values)
                    item.weight = ApplyUserFilterGetObjValue(propTarget, item).Contains(criteria) ? FontWeights.Bold : FontWeights.Normal;
                foreach (ejoTile item in CurrentLib.dclTiles.Values)
                    item.weight = ApplyUserFilterGetObjValue(propTarget, item).Contains(criteria) ? FontWeights.Bold : FontWeights.Normal;
                foreach (ejoEvent item in CurrentLib.events.Values)
                    item.weight = ApplyUserFilterGetObjValue(propTarget, item).Contains(criteria) ? FontWeights.Bold : FontWeights.Normal;
                foreach (ejoFunction item in CurrentLib.functions.Values)
                    item.weight = ApplyUserFilterGetObjValue(propTarget, item).Contains(criteria) ? FontWeights.Bold : FontWeights.Normal;
                foreach (ejoObject item in CurrentLib.objects.Values)
                    item.weight = ApplyUserFilterGetObjValue(propTarget, item).Contains(criteria) ? FontWeights.Bold : FontWeights.Normal;
                foreach (List<ejoFunction> lst in CurrentLib.ambiguousFunctions.Values)
                    foreach (ejoFunction item in lst)
                        item.weight = ApplyUserFilterGetObjValue(propTarget, item).Contains(criteria) ? FontWeights.Bold : FontWeights.Normal;
            }
        }



        private void tvApplyOverrides_MouseRightButtonDown(object sender, MouseButtonEventArgs e)
        {
            TreeViewItem treeViewItem = VisualUpwardSearch(e.OriginalSource as DependencyObject);
            if (treeViewItem != null)
            {
                treeViewItem.Focus();
                e.Handled = true;
            }
        }
        private void tvApplyOverrides_PreviewMouseRightButtonUp(object sender, MouseButtonEventArgs e)
        {
            TreeViewItem treeViewItem = VisualUpwardSearch(e.OriginalSource as DependencyObject);
            if (treeViewItem != null)
            {
                e.Handled = true;
                treeViewItem.Focus();
            }
        }



        static TreeViewItem VisualUpwardSearch(DependencyObject source)
        {
            while (source != null && !(source is TreeViewItem))
                source = VisualTreeHelper.GetParent(source);
            return source as TreeViewItem;
        }

        private void OverridesContextMenu_ContextMenuOpening(object sender, ContextMenuEventArgs e)
        {
            if (e.OriginalSource is TextBlock)
            {
                var tbx = (TextBlock)e.OriginalSource;
                object val = null;
                if (tbx.DataContext?.GetType().GetProperty("Key")?.Name != null && tbx.ContextMenu != null)
                    val = tbx.DataContext.GetType().GetProperty("Value").GetValue(tbx.DataContext);
                else if (tbx.DataContext.GetType().Name.StartsWith("ejo") == true)
                    val = tvApplyOverrides.SelectedItem;

                if (val != null && tbx.ContextMenu != null)
                {

                    string[] reflectedPath = new string[] { };
                    if (CurrentLib.dclAttributes.Values.Contains(val))
                        reflectedPath = new string[] { nameof(CurrentLib.dclAttributes), (val as ejoHelpEntity).id.ToLower() };
                    else if (CurrentLib.dclTiles.Values.Contains(val))
                        reflectedPath = new string[] { nameof(CurrentLib.dclTiles), (val as ejoHelpEntity).id.ToLower() };
                    else if (CurrentLib.events.Values.Contains(val))
                        reflectedPath = new string[] { nameof(CurrentLib.events), (val as ejoHelpEntity).id.ToLower() };
                    else if (CurrentLib.objects.Values.Contains(val))
                        reflectedPath = new string[] { nameof(CurrentLib.objects), (val as ejoHelpEntity).id.ToLower() };
                    else if (CurrentLib.functions.Values.Contains(val))
                        reflectedPath = new string[] { nameof(CurrentLib.functions), (val as ejoHelpEntity).id.ToLower() };
                    else if (val is ejoFunction && CurrentLib.ambiguousFunctions.Values.Any(p => p.Contains(val)))
                    {
                        var list = CurrentLib.ambiguousFunctions[(val as ejoHelpEntity).id.ToLower()];
                        reflectedPath = new string[] { nameof(CurrentLib.ambiguousFunctions), (val as ejoHelpEntity).id.ToLower(), "[" + list.IndexOf((ejoFunction)val) + "]" };
                    }

                    tbx.ContextMenu.Items.Clear();
                    tbx.ContextMenu.Tag = string.Join(",", reflectedPath);
                    if (val.GetType().GetInterface(nameof(System.Collections.IEnumerable)) == null)
                    {
                        foreach (var prop in val.GetType().GetProperties())
                        {
                            if (prop.Name != "weight")
                            {
                                var propVal = prop.GetValue(val);
                                MenuItem mui = new MenuItem() { Header = prop.Name, Tag = prop.Name };
                                cmiGenerator(mui, propVal, prop.Name);
                                tbx.ContextMenu.Items.Add(mui);
                            }
                        }
                    }
                    else
                        e.Handled = true;
                }
            }
        }

        private void cmiGenerator(MenuItem menu, object val, string propName = "")
        {
            var valType = val.GetType();
            if (valType.IsPrimitive == true || valType.IsEnum == true || valType.Name == "String" && propName != "")
            {
                if (menu.Header.ToString() == propName)
                {
                    menu.Header = propName + " : " + val.ToString().PadRight(50, ' ').Trim();
                    menu.Tag = propName;
                }
                else
                    menu.Items.Add(new MenuItem() { Header = propName + " : " + val.ToString().PadRight(50, ' ').Trim(), Tag = propName });
                return;
            }
            else if (valType.IsArray == true)
            {
                var nextVal = (object[])val;
                for (int i = 0; i < nextVal.Length; i++)
                {
                    MenuItem mui = new MenuItem() { Header = i + " : " + nextVal[i].ToString().PadRight(50, ' ').Trim(), Tag = "[" + i + "]" };
                    cmiGenerator(mui, nextVal[i]);
                    menu.Items.Add(mui);
                }
            }
            else if (valType.IsPrimitive == false && valType.IsEnum == false && valType.Name != "String")
            {
                foreach (var prop in valType.GetProperties())
                {
                    MenuItem mui = new MenuItem() { Header = prop.Name + " : " + prop.GetValue(val).ToString().PadRight(50, ' ').Trim(), Tag = prop.Name };
                    cmiGenerator(mui, prop.GetValue(val));
                    menu.Items.Add(mui);
                }
            }
        }

        private void MenuItem_PreviewMouseLeftButtonUp(object sender, MouseButtonEventArgs e)
        {
            if (e.Source is MenuItem)
            {
                FrameworkElement node = (FrameworkElement)e.Source;
                string path = "";
                // collect selected object reflection path
                while (node != null && !(node is Popup))
                {
                    path = node.Tag.ToString() + "," + path;
                    node = (FrameworkElement)node.Parent;
                }
                OverrideRule newRule = OverrideRule.Create(CurrentLib, path.TrimEnd(','));
                if (newRule != null)
                {
                    AllOverrides.Add(newRule);
                    lbxOverrideRules.SelectedItem = newRule;
                    AllOverrides.ToList().Pack(ioPathRuleOverrides);
                }
            }
            if (sender is ContextMenu)
                (sender as ContextMenu).IsOpen = false;
        }

        private void tvApplyOverrides_MouseLeftButtonUp(object sender, MouseButtonEventArgs e)
        {
            if (tvApplyOverrides.SelectedItem != null)
            {
                ejoHelpEntity tvEntity = null;
                if (tvApplyOverrides.SelectedItem.GetType().GetProperty("Key") != null && !(tvApplyOverrides.SelectedItem.GetType().GetProperty("Value").GetValue(tvApplyOverrides.SelectedItem) is List<ejoFunction>))
                    tvEntity = (ejoHelpEntity)tvApplyOverrides.SelectedItem.GetType().GetProperty("Value").GetValue(tvApplyOverrides.SelectedItem);
                else if (tvApplyOverrides.SelectedItem.GetType().Name.StartsWith("ejo") == true)
                    tvEntity = (ejoHelpEntity)tvApplyOverrides.SelectedItem;

                if (tvEntity != null)
                    wbApplyOverrides.Navigate(urlHelpers.getHelpURL(tvEntity.guid));
            }
        }
        #endregion


       



        #region Rule (right) Panel
        private void btnOverridesSaveRule_Click(object sender, RoutedEventArgs e)
        {
            if (lbxOverrideRules.SelectedItem != null)
            {
                OverrideRule rule = (OverrideRule)lbxOverrideRules.SelectedItem;
                rule.jsonValue = tbxOverridesEditor.Text;
                rule.notes = tbxOverrideEditorNotes.Text;
                AllOverrides.ToList().Pack(ioPathRuleOverrides);
            }
        }

        private void btnOverridesResetRule_Click(object sender, RoutedEventArgs e)
        {
            if (lbxOverrideRules.SelectedItem != null)
            {
                OverrideRule rule = (OverrideRule)lbxOverrideRules.SelectedItem;
                lbxOverrideRules.SelectedIndex = -1;
                lbxOverrideRules.SelectedItem = rule;
            }
        }

        private void lbxOverrideRules_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (lbxOverrideRules.SelectedItem != null)
            {
                OverrideRule rule = (OverrideRule)lbxOverrideRules.SelectedItem;
                try // neccessary evil so that rules can exist, but don't have to always be functional. This will handle testing of partial exports or potential legacy situations.
                {
                    ejoHelpEntity obj = OverrideRule.findeOverrideTargetObject(CurrentLib, rule.fullSelectedPath).source;
                    if (obj != null)
                        wbApplyOverrides.Navigate(urlHelpers.getHelpURL(obj.guid));
                }
                catch (Exception)
                {
                    MessageBox.Show("The selected OverrideRule references a path to an object that doesn't exist\n\n" + rule.fullSelectedPath, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void btnOverrideRuleDelete_Click(object sender, RoutedEventArgs e)
        {
            int ci = lbxOverrideRules.SelectedIndex;
            if (ci != -1)
            {
                AllOverrides.RemoveAt(ci);
                if (ci < AllOverrides.Count)
                    lbxOverrideRules.SelectedIndex = ci;
                AllOverrides.ToList().Pack(ioPathRuleOverrides);
            }
        }
        #endregion

    }
}
