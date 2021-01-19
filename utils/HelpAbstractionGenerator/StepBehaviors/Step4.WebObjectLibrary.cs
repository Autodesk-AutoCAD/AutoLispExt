using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows;
using HAP = HtmlAgilityPack;

namespace HelpAbstractionGenerator
{

    #region Exported Json Objects
    public class WebObjectLibrary
    {
        public string year { get; set; }
        public Dictionary<string, ejoObject> objects { get; set; } = new Dictionary<string, ejoObject>();
        public Dictionary<string, ejoFunction> functions { get; set; } = new Dictionary<string, ejoFunction>();
        public Dictionary<string, List<ejoFunction>> ambiguousFunctions { get; set; } = new Dictionary<string, List<ejoFunction>>();
        public Dictionary<string, string> enumerators { get; set; } = new Dictionary<string, string>();
        public Dictionary<string, ejoAttribute> dclAttributes { get; set; } = new Dictionary<string, ejoAttribute>();
        public Dictionary<string, ejoTile> dclTiles { get; set; } = new Dictionary<string, ejoTile>();
        public Dictionary<string, ejoEvent> events { get; set; } = new Dictionary<string, ejoEvent>();

        public WebObjectLibrary() { }
        public WebObjectLibrary(string year) { this.year = year; }
    }


    public enum ejoCategory
    {
        OBJECT = 0,
        METHOD = 1,
        PROPGETTER = 2,
        PROPSETTER = 3,
        FUNCTION = 4,
        ENUM = 5,
        DCLTILE = 6,
        DCLATT = 7,
        EVENT = 8
    }
    public class ejoHelpEntity : INotifyPropertyChanged
    {
        #region UI-Only Infrastructure
        
        private FontWeight _fw = FontWeights.Bold;        
        [Newtonsoft.Json.JsonIgnore]
        public FontWeight weight { get { return _fw; } set { _fw = value; NotifyPropertyChanged(nameof(weight)); } }
        public event PropertyChangedEventHandler PropertyChanged;
        private void NotifyPropertyChanged(string propertyName = "") { PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName)); } 
        #endregion


        public string id { get; set; }
        public ejoCategory category { get; set; }
        public string guid { get; set; }
        public string description { get; set; }
        public string platforms { get; set; }
        public ejoHelpEntity() { _fw = FontWeights.Bold; }
        public ejoHelpEntity(string _id, ejoCategory _cat, string _guid, string _desc, string _os) { id = _id; category = _cat; guid = _guid; description = _desc; platforms = _os; _fw = FontWeights.Bold; }

        public override string ToString() { return id; }

        protected void ApplyRuleToBase(OverrideRule rule)
        {
            switch (rule.targetProperty)
            {
                case nameof(guid):
                    this.guid = rule.jsonValue.UnPack<string>();
                    break;
                case nameof(description):
                    this.description = rule.jsonValue.UnPack<string>();
                    break;
                case nameof(platforms):
                    this.platforms = rule.jsonValue.UnPack<string>();
                    break;
            }
        }
        
        public virtual void ApplyRule(OverrideRule rule) 
        {
            ApplyRuleToBase(rule);
        }
    }


    public class ejoObject : ejoHelpEntity
    {
        public string[] methods { get; set; }
        public string[] properties { get; set; }
        public ejoObject() { }

        public override void ApplyRule(OverrideRule rule)
        {   
            switch (rule.targetProperty)
            {
                case nameof(methods):
                    this.methods = rule.jsonValue.UnPack<string[]>();
                    break;
                case nameof(properties):
                    this.properties = rule.jsonValue.UnPack<string[]>();
                    break;
                default:
                    ApplyRuleToBase(rule);
                    break;
            }
        }
    }

    public class ejoEvent : ejoHelpEntity
    {
        public ejoEvent() { }
    }

    public class ejoAttribute : ejoHelpEntity
    {
        public string signature { get; set; }
        public ejoValueType valueType { get; set; }
        public ejoAttribute() { }

        public override void ApplyRule(OverrideRule rule)
        {
            switch (rule.targetProperty)
            {
                case nameof(signature):
                    this.signature = rule.jsonValue.UnPack<string>();
                    break;
                case nameof(valueType):
                    this.valueType = rule.jsonValue.UnPack<ejoValueType>();
                    break;
                default:
                    ApplyRuleToBase(rule);
                    break;
            }
        }
    }

    public class ejoTile : ejoHelpEntity
    {
        public string signature { get; set; }
        public string[] attributes { get; set; }
        public ejoTile() { }

        public override void ApplyRule(OverrideRule rule)
        {
            switch (rule.targetProperty)
            {
                case nameof(signature):
                    this.signature = rule.jsonValue.UnPack<string>();
                    break;
                case nameof(attributes):
                    this.attributes = rule.jsonValue.UnPack<string[]>();
                    break;
                default:
                    ApplyRuleToBase(rule);
                    break;
            }
        }
    }

    public class ejoFunction : ejoHelpEntity
    {
        public ejoValueType[] arguments { get; set; }
        public ejoValueType returnType { get; set; }
        public string[] validObjects { get; set; }
        public string signature { get; set; }
        public ejoFunction() { }

        public override void ApplyRule(OverrideRule rule)
        {
            switch (rule.targetProperty)
            {
                case nameof(signature):
                    this.signature = rule.jsonValue.UnPack<string>();
                    break;
                case nameof(returnType):
                    this.returnType = rule.jsonValue.UnPack<ejoValueType>();
                    break;
                case nameof(arguments):
                    this.arguments = rule.jsonValue.UnPack<ejoValueType[]>();
                    break;
                case nameof(validObjects):
                    this.validObjects = rule.jsonValue.UnPack<string[]>();
                    break;
                default:
                    ApplyRuleToBase(rule);
                    break;
            }
        }
    }



    public class ejoValueType
    {
        /// All these static lists are handling a consistent identification and output. Also was used to handle some irregularities by figuring out what some of the special names represented
        private static List<string> VlaPrimitives = new List<string> { "Boolean", "Double", "Long", "Integer", "String", "Object", "Variant", "Variant:XYZ", "Variant:XY", "Variant:Bool", "Variant:Dbl", "Variant:Long", "Variant:Int", "Variant:Shrt", "Variant:Str", "Variant:obj", "Long", "Double", "Double", "Long" };
        private static List<string> ucVlaPrimitives = new List<string> { "BOOLEAN", "DOUBLE", "LONG", "INTEGER", "STRING", "OBJECT", "VARIANT", "VARIANT:XYZ", "VARIANT:XY", "VARIANT:BOOL", "VARIANT:DBL", "VARIANT:LONG", "VARIANT:INT", "VARIANT:SHRT", "VARIANT:STR", "VARIANT:OBJ", "LONG_PTR", "ACAD_NOUNITS", "ACAD_ANGLE", "ACAD_LTYPE" };
        private static List<string> AllDrawingObjects = new List<string> { "3DFace", "3DPolyline", "3DSolid", "Arc", "Attribute", "BlockReference", "Circle", "ComparedReference", "DgnUnderlay", "Dim3PointAngular", "DimAligned", "DimAngular", "DimArcLength", "DimDiametric", "DimOrdinate", "DimRadial", "DimRadialLarge", "DimRotated", "DwfUnderlay", "Ellipse", "ExternalReference", "ExtrudedSurface", "GeomapImage", "GeoPositionMarker", "Hatch", "Helix", "Leader", "LightweightPolyline", "LWPolyline", "Line", "LoftedSurface", "MInsertBlock", "MLeader", "MLine", "MText", "NurbSurface", "OLE", "PdfUnderlay", "PlaneSurface", "Point", "PointCloud", "PointCloudEx", "PolyfaceMesh", "PolygonMesh", "Polyline", "PViewport", "RasterImage", "Ray", "Region", "RevolvedSurface", "Section", "Shape", "Solid", "Spline", "SubDMesh", "Surface", "SweptSurface", "Table", "Text", "Tolerance", "Trace", "Wipeout", "XLine" };
        private static List<string> ucAllDrawingObjects = new List<string> { "3DFACE", "3DPOLYLINE", "3DSOLID", "ARC", "ATTRIBUTE", "BLOCKREFERENCE", "CIRCLE", "COMPAREDREFERENCE", "DGNUNDERLAY", "DIM3POINTANGULAR", "DIMALIGNED", "DIMANGULAR", "DIMARCLENGTH", "DIMDIAMETRIC", "DIMORDINATE", "DIMRADIAL", "DIMRADIALLARGE", "DIMROTATED", "DWFUNDERLAY", "ELLIPSE", "EXTERNALREFERENCE", "EXTRUDEDSURFACE", "GEOMAPIMAGE", "GEOPOSITIONMARKER", "HATCH", "HELIX", "LEADER", "LIGHTWEIGHTPOLYLINE", "LWPOLYLINE", "LINE", "LOFTEDSURFACE", "MINSERTBLOCK", "MLEADER", "MLINE", "MTEXT", "NURBSURFACE", "OLE", "PDFUNDERLAY", "PLANESURFACE", "POINT", "POINTCLOUD", "POINTCLOUDEX", "POLYFACEMESH", "POLYGONMESH", "POLYLINE", "PVIEWPORT", "RASTERIMAGE", "RAY", "REGION", "REVOLVEDSURFACE", "SECTION", "SHAPE", "SOLID", "SPLINE", "SUBDMESH", "SURFACE", "SWEPTSURFACE", "TABLE", "TEXT", "TOLERANCE", "TRACE", "WIPEOUT", "XLINE" };
        private static List<string> AllNonDrawingObjects = new List<string> { "_DAcadApplicationEvents", "_DAcadDocumentEvents", "AcadState", "AcCmColor", "Application", "AttributeReference", "Block", "Database", "DatabasePreferences", "Dictionary", "DimStyle", "Document", "DynamicBlockReferenceProperty", "FileDependencies", "Group", "Hyperlink", "IAcadDatabase", "IAcadDimension", "IAcadEntity", "IAcadMLeaderLeader", "IAcadObject", "IAcadObjectEvents", "IDPair", "Layer", "LayerStateManager", "Layout", "Linetype", "Material", "MenuGroup", "MLeaderStyle", "Plot", "PlotConfiguration", "PopupMenu", "PopupMenuItem", "Preferences", "PreferencesDisplay", "PreferencesDrafting", "PreferencesFiles", "PreferencesOpenSave", "PreferencesOutput", "PreferencesProfiles", "PreferencesSelection", "PreferencesSystem", "PreferencesUser", "RegisteredApplication", "SectionManager", "SectionSettings", "SectionTypeSettings", "SecurityParams", "SelectionSet", "SortentsTable", "SubDMeshEdge", "SubDMeshFace", "SubDMeshVertex", "SubEntity", "SubEntSolidEdge", "SubEntSolidFace", "SubEntSolidNode", "SubEntSolidVertex", "SummaryInfo", "TableStyle", "TextStyle", "Toolbar", "ToolbarItem", "UCS", "Utility", "View", "Viewport", "XRecord" };
        private static List<string> ucAllNonDrawingObjects = new List<string> { "_DACADAPPLICATIONEVENTS", "_DACADDOCUMENTEVENTS", "ACADSTATE", "ACCMCOLOR", "APPLICATION", "ATTRIBUTEREFERENCE", "BLOCK", "DATABASE", "DATABASEPREFERENCES", "DICTIONARY", "DIMSTYLE", "DOCUMENT", "DYNAMICBLOCKREFERENCEPROPERTY", "FILEDEPENDENCIES", "GROUP", "HYPERLINK", "IACADDATABASE", "IACADDIMENSION", "IACADENTITY", "IACADMLEADERLEADER", "IACADOBJECT", "IACADOBJECTEVENTS", "IDPAIR", "LAYER", "LAYERSTATEMANAGER", "LAYOUT", "LINETYPE", "MATERIAL", "MENUGROUP", "MLEADERSTYLE", "PLOT", "PLOTCONFIGURATION", "POPUPMENU", "POPUPMENUITEM", "PREFERENCES", "PREFERENCESDISPLAY", "PREFERENCESDRAFTING", "PREFERENCESFILES", "PREFERENCESOPENSAVE", "PREFERENCESOUTPUT", "PREFERENCESPROFILES", "PREFERENCESSELECTION", "PREFERENCESSYSTEM", "PREFERENCESUSER", "REGISTEREDAPPLICATION", "SECTIONMANAGER", "SECTIONSETTINGS", "SECTIONTYPESETTINGS", "SECURITYPARAMS", "SELECTIONSET", "SORTENTSTABLE", "SUBDMESHEDGE", "SUBDMESHFACE", "SUBDMESHVERTEX", "SUBENTITY", "SUBENTSOLIDEDGE", "SUBENTSOLIDFACE", "SUBENTSOLIDNODE", "SUBENTSOLIDVERTEX", "SUMMARYINFO", "TABLESTYLE", "TEXTSTYLE", "TOOLBAR", "TOOLBARITEM", "UCS", "UTILITY", "VIEW", "VIEWPORT", "XRECORD" };
        private static List<string> ucAltNonDrawingObjects = new List<string> { "DACADAPPLICATIONEVENTS", "DACADDOCUMENTEVENTS", "ACADSTATE", "ACCMCOLOR", "APPLICATION", "ATTRIBUTEREFERENCE", "BLOCK", "DATABASE", "DATABASEPREFERENCES", "DICTIONARY", "DIMSTYLE", "DOCUMENT", "DYNAMICBLOCKREFERENCEPROPERTY", "FILEDEPENDENCIES", "GROUP", "HYPERLINK", "ACADDATABASE", "ACADDIMENSION", "ACADENTITY", "ACADMLEADERLEADER", "ACADOBJECT", "ACADOBJECTEVENTS", "IDPAIR", "LAYER", "LAYERSTATEMANAGER", "LAYOUT", "LINETYPE", "MATERIAL", "MENUGROUP", "MLEADERSTYLE", "PLOT", "PLOTCONFIGURATION", "POPUPMENU", "POPUPMENUITEM", "PREFERENCES", "PREFERENCESDISPLAY", "PREFERENCESDRAFTING", "PREFERENCESFILES", "PREFERENCESOPENSAVE", "PREFERENCESOUTPUT", "PREFERENCESPROFILES", "PREFERENCESSELECTION", "PREFERENCESSYSTEM", "PREFERENCESUSER", "REGISTEREDAPPLICATION", "SECTIONMANAGER", "SECTIONSETTINGS", "SECTIONTYPESETTINGS", "SECURITYPARAMS", "SELECTIONSET", "SORTENTSTABLE", "SUBDMESHEDGE", "SUBDMESHFACE", "SUBDMESHVERTEX", "SUBENTITY", "SUBENTSOLIDEDGE", "SUBENTSOLIDFACE", "SUBENTSOLIDNODE", "SUBENTSOLIDVERTEX", "SUMMARYINFO", "TABLESTYLE", "TEXTSTYLE", "TOOLBAR", "TOOLBARITEM", "UCS", "UTILITY", "VIEW", "VIEWPORT", "XRECORD" };
        private static List<string> AllCollectionObjects = new List<string> { "Blocks", "Dictionaries", "DimStyles", "Documents", "Groups", "Hyperlinks", "Layers", "Layouts", "Linetypes", "Materials", "MenuBar", "MenuGroups", "ModelSpace", "PaperSpace", "PlotConfigurations", "PopupMenus", "RegisteredApplications", "SelectionSets", "TextStyles", "Toolbars", "UCSs", "Viewports", "Views" };
        private static List<string> ucAllCollectionObjects = new List<string> { "BLOCKS", "DICTIONARIES", "DIMSTYLES", "DOCUMENTS", "GROUPS", "HYPERLINKS", "LAYERS", "LAYOUTS", "LINETYPES", "MATERIALS", "MENUBAR", "MENUGROUPS", "MODELSPACE", "PAPERSPACE", "PLOTCONFIGURATIONS", "POPUPMENUS", "REGISTEREDAPPLICATIONS", "SELECTIONSETS", "TEXTSTYLES", "TOOLBARS", "UCSS", "VIEWPORTS", "VIEWS" };

        private static List<string> LispPrimitives = new List<string> { "Integer", "Real", "String", "List", "Ename", "Boolean", "nil", "Error" };
        private static List<string> ucLispPrimitives = new List<string> { "INTEGER", "REAL", "STRING", "LIST", "ENAME", "T", "NIL", "ERROR" };
        private static List<string> LispExtended = new List<string> { "Pickset", "File", "Safearray", "Variant", "Vla-Object", "Vlr-Object", "Subroutine", "Symbol", "Catch-All-Apply-Error", "Any" };
        private static List<string> ucLispExtended = new List<string> { "PICKSET", "FILE", "SAFEARRAY", "VARIANT", "VLA-OBJECT", "VLR-OBJECT", "SUBROUTINE", "SYMBOL", "CATCH-ALL-APPLY-ERROR", "VARIES" };

        public string id { get; set; }
        public string typeNames { get; set; }
        public string primitive { get; set; }
        public string[] enums { get; set; } = new string[] { };
        public ejoValueType() { }

        
        /// <returns>When includeEnums=True includes enums in the output. If=Null returns ONLY the enums and else=False excludes the enums</returns>
        public string getUpperCaseSearchString(bool? includeEnums)
        {
            switch (includeEnums)
            {
                case true:
                    return id.ToUpper() + " " + typeNames + " " + primitive + " " + string.Join(", ", enums).ToUpper();
                case false:
                    return id.ToUpper() + " " + typeNames + " " + primitive;
                default:
                    return string.Join(", ", enums).ToUpper();
            }
        }

        public static ejoValueType nil(string _id = "nil") { return new ejoValueType() { id = _id, typeNames = "nil", primitive = "nil" }; }

        public ejoValueType(string title, string typeDesc, HAP.HtmlNode TableOrUlNode, linkCategory category)
        {
            if (typeDesc.getLetters().Contains("NORETURNVALUE") || typeDesc.ToUpper() == "NIL" || typeDesc.ToUpper() == "NONE")
            {
                this.id = title;
                this.typeNames = "none";
                this.primitive = "none";
            }
            else if (category == linkCategory.Object)
            {
                this.id = "Object";
                this.typeNames = string.Join(", ", getValidVlaObjectReferences(typeDesc.splitByAnyChar(",:"), true, "TYPE").OrderBy(p => p));
                this.primitive = "vla-object";
            }
            else if (category == linkCategory.Method || category == linkCategory.Property)
            {
                var vlatypes = extractVlaTypes(typeDesc);
                var decrypted = getValidVlaObjectReferences(typeDesc.splitByAnyChar(",:"), true, "TYPE").OrderBy(p => p).ToArray();
                if (title.ToUpper() == "OBJECT")
                    vlatypes = string.Join(", ", decrypted);
                this.id = title;
                this.typeNames = vlatypes;
                this.primitive = typeDesc.ToUpper().Contains("ENUM") | typeDesc.ToUpper().Contains("(CONSTANT)") ? "enum" : extractVlaPrimitive(vlatypes.splitByAnyChar(",").ToArray(), decrypted);
                this.enums = vlatypes == "Boolean" ? new string[] { "Vlax:True", "Vlax:False" } : getVlaEnumList(TableOrUlNode, 4, typeDesc).ToArray();
            }
            else if (category == linkCategory.Function)
            {
                var lspTypes = getValidFuncTypes(typeDesc.splitByAnyChar(",: ()"));
                id = title;
                this.typeNames = lspTypes;
                this.primitive = extractFuncPrimitive(lspTypes.splitByAnyChar(", ").ToArray(), title == "Return");
                this.enums = ScrapeDocumentDeconstructor.getTableValues(TableOrUlNode == null || TableOrUlNode.OuterHtml.ToUpper().StartsWith("<UL") ? null : TableOrUlNode).names;
            }
            // All other categories (mostly DCL) were handled directly in their Parse functions
        }

        public ejoValueType(string title, string typeDesc, HAP.HtmlNode parent, string profile) // Specifically a constructor for ejoFunction ValueTypes
        {
            var lspTypes = getValidFuncTypes(typeDesc.splitByAnyChar(",: ()"));
            id = title;
            this.typeNames = lspTypes;
            this.primitive = extractFuncPrimitive(lspTypes.splitByAnyChar(", ").ToArray(), title == "Return");

            if (profile == "type" && title.ToLower() == "return" && parent.getDoc().SelectSingleNode("//table") != null)
                this.enums = ScrapeDocumentDeconstructor.getTableValues(parent.getDoc().SelectSingleNode("//table"), "DATA TYPE").names;
            else if (profile.StartsWith("vlr") && title.ToLower().Contains("callback") && parent.getDoc().SelectSingleNode("//table") != null)
                this.enums = ScrapeDocumentDeconstructor.getTableValues(parent.getDoc().SelectSingleNode("//table")).names;
            else if (profile.StartsWith("vlr") && title.ToLower().Contains("reactor-type") && parent.getDoc().SelectSingleNode(parent.XPath + "//ul") != null)
                this.enums = parent.getDoc().SelectSingleNode(parent.XPath + "//ul").ChildNodes.Where(p => p.NodeType == HAP.HtmlNodeType.Element).Select(p => p.InnerText.Normalization()).ToArray();
            else if (profile == "ssget" && title.ToLower() == "sel-method") // too complicated to parse these potential options
                this.enums = new string[] { "_", ":", "-", "+", "A", "C", "CP", "F", "I", "L", "P", "W", "WP", "X", "D", "E", "L", "N", "R", "S", "U", "V" };
            else if (profile == "tblnext" && title.ToLower() == "table-name") // 1-Off
                this.enums = new string[] { "APPID", "BLOCK", "DIMSTYLE", "LAYER", "LTYPE", "STYLE", "UCS", "VIEW", "VPORT" };
            else if (parent.getDoc().SelectSingleNode(parent.XPath + "//strong") != null)
            {
                List<string> possibleValues = new List<string>();
                foreach (var item in parent.getDoc().SelectNodes(parent.XPath + "//strong").Skip(1))
                {
                    string itmValue = item.InnerText.Normalization();
                    if (itmValue != "" && itmValue.ToUpper() != "T" && itmValue.ToUpper() != "NIL" && itmValue.Contains(" ") == false)
                        possibleValues.Add(itmValue);
                }
                this.enums = possibleValues.Distinct().ToArray();
            }
        }


        public override string ToString() { return id + "<" + primitive + ">"; } 
        public string ToString(bool isOptional) { return id + (isOptional ? "?" : "") + "<" + primitive + ">"; }


        #region Function Handlers
        public static string extractFuncPrimitive(string[] values, bool isReturn = false)
        {
            bool canNil = values.Contains("nil");
            bool canError = values.Contains("Error");
            if (isReturn == false)
            {
                canNil = false;
                canError = false;
            }
            values = values.Where(p => p != "nil" && p != "Error").ToArray();
            if (values.Length == 0 && canNil == false)
                return "none" + (canError ? "!" : "");
            if (values.Length == 0 && canNil == true)
                return "nil" + (canError ? "!" : "");
            else if (values.Length == 1)
                return values[0].ToLower() + (canNil ? "?" : "") + (canError ? "!" : "");
            else if (values.Length == 2)
                return values[0].ToLower() + (canNil ? "?" : "") + "|" + values[1].ToLower() + (canNil ? "?" : "") + (canError ? "!" : "");
            else if (values.Length < 6)
                return "many" + (canNil ? "?" : "") + (canError ? "!" : "");
            else
                return "any" + (canNil ? "?" : "") + (canError ? "!" : "");
        }

        public static string getValidFuncTypes(IEnumerable<string> values, params string[] specialExcludes)
        {
            List<string> pResult = new List<string>();
            List<string> xResult = new List<string>();
            List<string> Values = values.ToList();
            specialExcludes = specialExcludes.Select(p => p.ToUpper()).ToArray();
            for (int i = 0; i < Values.Count; i++)
            {
                if (specialExcludes.Contains(Values[i].ToUpper().Trim()))
                    continue;
                else if (ucLispPrimitives.Contains(Values[i].Trim().ToUpper()))
                    pResult.Add(LispPrimitives[ucLispPrimitives.IndexOf(Values[i].Trim().ToUpper())]);
                else if (ucLispExtended.Contains(Values[i].Trim().ToUpper()))
                    xResult.Add(LispExtended[ucLispExtended.IndexOf(Values[i].Trim().ToUpper())]);

                if (Values[i].ToUpper() == "VLR" && i + 1 < Values.Count && Values[i + 1].ToUpper() == "OBJECT")
                    xResult.Add("Vlr-Object");
                if (Values[i].ToUpper() == "VLA" && i + 1 < Values.Count && Values[i + 1].ToUpper() == "OBJECT")
                    xResult.Add("Vla-Object");
                if (Values[i].ToUpper() == "SAFE" && i + 1 < Values.Count && Values[i + 1].ToUpper() == "ARRAY")
                    xResult.Add("Safearray");
            }
            pResult.AddRange(xResult);
            return string.Join(", ", pResult.Distinct().OrderBy(p => p));
        }

        public static List<ejoValueType> extractFuncArguments(HAP.HtmlNode dlNode, string profile) //, string sigValue)
        {
            List<ejoValueType> result = new List<ejoValueType>();
            List<HAP.HtmlNode> headerNodes = dlNode == null ? null : dlNode.getDoc().SelectNodes(dlNode.XPath + "//dt").ToList();
            List<HAP.HtmlNode> dataNodes = dlNode == null ? null : dlNode.getDoc().SelectNodes(dlNode.XPath + "//dd").ToList();
            if (headerNodes == null || headerNodes.Count != dataNodes.Count)
                return result;
            for (int i = 0; i < headerNodes.Count; i++)
            {
                string[] argNames = headerNodes[i].InnerText.Normalization().Replace("...", "").splitByAnyChar(" ,()[]").ToArray();
                string typeVal = "";
                foreach (HAP.HtmlNode item in dlNode.getDoc().SelectNodes(dataNodes[i].XPath + "//p"))
                    if (item.InnerText.getLetters().StartsWith("TYPE"))
                        typeVal = item.InnerText.Normalization();
                foreach (string name in argNames)
                    result.Add(new ejoValueType(name, typeVal, i < dataNodes.Count ? dataNodes[i] : headerNodes[i], profile));
            }
            return result;
        }
        #endregion


        #region VlaHandlers
        // This is no longer used, delegating this output to the TypeScript side.
        public string ToVlaReturnString() 
        { return (typeNames.Contains(",") == false && ejoValueType.ucVlaPrimitives.Contains(typeNames.ToUpper()) == false ? typeNames : "") + "<" + primitive + ">"; }

        public static string[] getValidVlaObjectReferences(IEnumerable<string> values, bool ignoreCase, params string[] specialExcludes)
        {
            List<string> result = new List<string>();
            if (ignoreCase == true)
                specialExcludes = specialExcludes.Select(p => p.ToUpper()).ToArray();
            foreach (string entry in values)
            {
                if (specialExcludes.Contains(entry.ToUpper().Trim()))
                    continue;
                else if (entry.getLetters() == "ALLDRAWINGOBJECTS")
                    result.AddRange(AllDrawingObjects);
                else if (entry.getLetters() == "ALLCOLLECTIONS")
                    result.AddRange(AllCollectionObjects);
                else if (ignoreCase == true && entry.Trim() != "" && entry.Trim().Contains(" ") == false && specialExcludes.Contains(entry.Trim().ToUpper()) == false)
                    result.Add(entry.Trim());
                else if (ignoreCase == false && entry.Trim() != "" && entry.Trim().Contains(" ") == false && specialExcludes.Contains(entry.Trim()) == false)
                    result.Add(entry.Trim());
            }
            return result.Distinct().ToArray();
        }

        public static string extractVlaTypes(string str)
        {
            List<string> standardTypes = new List<string>();
            List<string> deviations = new List<string>();
            var parts = str.splitByAnyChar(":, ");
            var partsUC = str.ToUpper().splitByAnyChar(":, ()");
            foreach (var item in parts)
            {
                if (ucAllCollectionObjects.Contains(item.ToUpper()))
                    standardTypes.Add(AllCollectionObjects[ucAllCollectionObjects.IndexOf(item.ToUpper())]);
                else if (ucAllDrawingObjects.Contains(item.ToUpper()))
                    standardTypes.Add(AllDrawingObjects[ucAllDrawingObjects.IndexOf(item.ToUpper())]);
                else if (ucAllNonDrawingObjects.Contains(item.ToUpper()))
                    standardTypes.Add(AllNonDrawingObjects[ucAllNonDrawingObjects.IndexOf(item.ToUpper())]);
                else if (ucAltNonDrawingObjects.Contains(item.ToUpper()))
                    standardTypes.Add(AllNonDrawingObjects[ucAltNonDrawingObjects.IndexOf(item.ToUpper())]);
                else if (ucVlaPrimitives.Contains(item.ToUpper()))
                {
                    if (item.ToUpper() == "VARIANT")
                    {
                        if (partsUC.Contains("DOUBLE") || partsUC.Contains("DOUBLES"))
                        {
                            if (partsUC.Contains("THREE") && partsUC.Contains("ELEMENT") || partsUC.Contains("THREE-ELEMENT"))
                                standardTypes.Add("Variant:XYZ");
                            else if (partsUC.Contains("TWO") && partsUC.Contains("ELEMENT") || partsUC.Contains("TWO-ELEMENT"))
                                standardTypes.Add("Variant:XY");
                            else
                                standardTypes.Add("Variant:Dbl");
                        }
                        else if (partsUC.Contains("OBJECTS"))
                            standardTypes.Add("Variant:Obj");
                        else if (partsUC.Contains("LONG") || partsUC.Contains("LONGS"))
                            standardTypes.Add("Variant:Long");
                        else if (partsUC.Contains("INTEGER") || partsUC.Contains("INTEGERS"))
                            standardTypes.Add("Variant:Int");
                        else if (partsUC.Contains("SHORT") || partsUC.Contains("SHORTS"))
                            standardTypes.Add("Variant:Shrt");
                        else if (partsUC.Contains("BOOLEAN") || partsUC.Contains("BOOLEANS"))
                            standardTypes.Add("Variant:Bool");
                        else if (partsUC.Contains("STRING") || partsUC.Contains("STRINGS"))
                            standardTypes.Add("Variant:Str");
                        else
                            standardTypes.Add("Variant");
                    }
                    else
                        standardTypes.Add(VlaPrimitives[ucVlaPrimitives.IndexOf(item.ToUpper())]);
                }
                else if (item.ToUpper() != "TYPE")
                    deviations.Add(item);
            }

            if (deviations.Count >= 1 && deviations.Select(p => p.ToUpper()).Contains("ENUM") == true)
                return deviations[deviations.Select(p => p.ToUpper()).ToList().IndexOf("ENUM") - 1];
            else if (deviations.Count >= 1 && deviations.Select(p => p.ToUpper()).Contains("(CONSTANT)") == true)
                return deviations[deviations.Select(p => p.ToUpper()).ToList().IndexOf("(CONSTANT)") - 1];
            else if (standardTypes.Count >= 1)
                return string.Join(", ", standardTypes);
            else
                return string.Join(", ", deviations);
        }

        public static string extractVlaPrimitive(string[] values, string[] swappedValues)
        {
            if (values.Any(p => ucAllCollectionObjects.Contains(p.ToUpper()) || ucAllNonDrawingObjects.Contains(p.ToUpper()) || ucAltNonDrawingObjects.Contains(p.ToUpper()) || ucAllDrawingObjects.Contains(p.ToUpper())) == true)
                return "vla-object";
            else if (values.Any(p => ucVlaPrimitives.Contains(p.ToUpper())) == true)
                return VlaPrimitives[ucVlaPrimitives.IndexOf(values.FirstOrDefault().ToUpper())].ToLower();
            else if (string.Join("", values).ToUpper().Contains("NORETURN") || string.Join("", values).ToUpper().Contains("NO RETURN"))
                return "nil";
            else
            {
                if (values.Any(p => ucAllCollectionObjects.Contains(p.ToUpper()) || ucAllNonDrawingObjects.Contains(p.ToUpper()) || ucAltNonDrawingObjects.Contains(p.ToUpper()) || ucAllDrawingObjects.Contains(p.ToUpper())) == true)
                    return "vla-object";
                else
                    return "unknown";
            }
        }

        public static string[] getVlaEnumList(HAP.HtmlNode ulNode, int minlength, string fieldValue)
        {
            List<string> result = new List<string>();
            if (ulNode == null || ulNode.OuterHtml.ToUpper().StartsWith("<UL") == false || fieldValue.ToUpper().Contains("ENUM") == false && fieldValue.ToUpper().Contains("(CONSTANT)") == false)
                return result.ToArray();
            else
            {
                foreach (HAP.HtmlNode li in ulNode.ChildNodes)
                    if (li.OuterHtml.ToUpper().StartsWith("<LI") == true)
                    {
                        if (li.InnerHtml.ToUpper().Contains("<SAMP") == true)
                            result.Add(li.getDoc().SelectSingleNode(li.XPath + "//samp").InnerText.Normalization());
                        else
                            result.Add(li.InnerText.Normalization().splitByAnyChar(" :").First());
                    }

                return result.Where(p => p.Length >= minlength).ToArray();
            }
        }

        public static List<(ejoValueType value, bool optional)> extractVlaArguments(HAP.HtmlNode dlNode, string sigValue, linkCategory category)
        {
            List<(ejoValueType value, bool optional)> result = new List<(ejoValueType value, bool optional)>();
            List<HAP.HtmlNode> headerNodes = dlNode == null ? null : dlNode.getDoc().SelectNodes(dlNode.XPath + "//dt").ToList();
            List<HAP.HtmlNode> dataNodes = dlNode == null ? null : dlNode.getDoc().SelectNodes(dlNode.XPath + "//dd").ToList();
            if (headerNodes == null || headerNodes.Count != dataNodes.Count)
                return result;
            for (int i = 0; i < headerNodes.Count; i++)
            {
                string argName = headerNodes[i].InnerText.Normalization().Replace(" ", "").Replace(",", "");
                HAP.HtmlNode ulNode = dlNode.getDoc().SelectSingleNode(dataNodes[i].XPath + "//ul");
                string typeVal = "", access = "";
                foreach (HAP.HtmlNode item in dlNode.getDoc().SelectNodes(dataNodes[i].XPath + "//p"))
                {
                    if (item.InnerText.getLetters().StartsWith("ACCESS"))
                        access = item.InnerText.getLetters();
                    else if (item.InnerText.getLetters().StartsWith("TYPE"))
                        typeVal = item.InnerText.Normalization();
                }
                ejoValueType v = new ejoValueType(argName, typeVal, ulNode, category);
                if (i == 0 && category == linkCategory.Method) v.id = "Object";
                if (category == linkCategory.Method || category == linkCategory.Property)
                    result.Add((v, access.Contains("OPTIONAL") == true && access.Contains("OBJECT") == false && access.Contains("EXCEPT") == false));
                else
                    result.Add((v, access.Contains("OPTIONAL") | argName.isMarkedOptional(sigValue)));
            }
            return result;
        }
        #endregion

    }
    #endregion




    #region Internal Document Objects
    public class ScrapeDocumentDeconstructor
    {
        public HAP.HtmlNode ntitle, ndescription, nplatform, ntable, npre;
        public HAP.HtmlNodeCollection nprechildren;
        public List<HAP.HtmlNode> signatureHeaders { get; set; } = new List<HAP.HtmlNode>();
        public List<HAP.HtmlNode> returnValHeaders { get; set; } = new List<HAP.HtmlNode>();
        public string Title { get { return ntitle.InnerText.Normalization().Split(' ')[0]; } }

        public string DclDescription { get { return nprechildren == null || nprechildren.Count < 3 ? "" : string.Join(" ", nprechildren.Skip(2).Select(p => p.InnerText.Normalization())); } }
        public string DclSignature { get { return npre.InnerText.Normalization(); } }
        public string Description { get { return ndescription.InnerText.Normalization(); } }
        public string Platforms { get { return (nplatform.InnerText.ToUpper().Contains("WINDOW") ? "WIN" : "") + (nplatform.InnerText.ToUpper().Contains("MAC") ? "|MAC" : ""); } }

        public ScrapeDocumentDeconstructor(HAP.HtmlNode doc)
        {
            ntitle = doc.SelectSingleNode("//h1");
            ndescription = doc.SelectNodes("//p").Where(p => p.HasClass("shortdesc")).First();
            nplatform = ndescription.nextRealSibling();
            ntable = doc.SelectSingleNode("//table");
            npre = doc.SelectSingleNode("//pre");
            nprechildren = doc.SelectNodes(npre.ParentNode.XPath + "//p");
            foreach (var item in doc.SelectNodes("//h2"))
            {
                string text = item.InnerText.getLetters();
                if (text.StartsWith("SIGNATURE") || text.StartsWith("SYNTAX"))
                    signatureHeaders.Add(item);
                else if (text.StartsWith("RETURNVALUE") || text.StartsWith("PROPERTYVALUE"))
                    returnValHeaders.Add(item);
            }
            if (returnValHeaders.Count == 0)
            {
                foreach (var item in doc.SelectNodes("//h3"))
                {
                    string text = item.InnerText.getLetters();
                    if (text.StartsWith("RETURNVALUE") || text.StartsWith("PROPERTYVALUE"))
                        returnValHeaders.Add(item);
                }
            }
        }

        public string getProfile(ejoCategory _category, bool lower = true)
        {
            switch (_category)
            {
                case ejoCategory.METHOD: return "vla-" + (lower ? Title.ToLower() : Title);
                case ejoCategory.PROPGETTER: return "vla-get-" + (lower ? Title.ToLower() : Title);
                case ejoCategory.PROPSETTER: return "vla-set-" + (lower ? Title.ToLower() : Title);
                case ejoCategory.DCLTILE: return (lower ? Title.Trim(" :".ToCharArray()).ToLower() : Title);
                default: return lower ? Title.ToLower() : Title;
            }
        }

        
        public static (string[] methods, string[] properties, string[] names) getTableValues(HAP.HtmlNode ntable, string other = "NAME")
        {
            string[] meths = new string[] { };
            string[] props = new string[] { };
            string[] names = new string[] { };
            if (ntable != null)
            {
                var hRows = ntable.getDoc().SelectNodes(ntable.XPath + "//thead//tr");
                var hData = ntable.getDoc().SelectNodes(hRows.Last().XPath + "//th");
                var dData = ntable.getDoc().SelectNodes(ntable.XPath + "//tbody//td");
                for (int i = 0; i < hData.Count; i++)
                {
                    if (hData[i].InnerText.ToUpper().Contains("METHOD") == true)
                        meths = dData[i].InnerText.Normalization().Split(' ').Select(p => "vla-" + p).ToArray();
                    else if (hData[i].InnerText.ToUpper().Contains("PROPERT") == true)
                        props = dData[i].InnerText.Normalization().Split(' ').Select(p => "vla-get-" + p).ToArray();
                    else if (hData[i].InnerText.ToUpper().Contains(other) == true)
                    {
                        if (hData.Count == dData.Count)
                            names = dData[i].InnerText.Normalization().Split(' ').Select(p => p.ToUpper().StartsWith("VLR-") ? ":" + p : p).ToArray();
                        else
                        {
                            List<string> firstValues = new List<string>();
                            for (int j = 0; j < dData.Count; j += hData.Count)
                                firstValues.Add(dData[j].InnerText.Normalization());
                            names = firstValues.Select(p => p.ToUpper().StartsWith("VLR-") ? ":" + p : p).ToArray();
                        }
                    }
                }
            }
            return (meths, props, names);
        }

        public string vlaSignatureBuilder(string profile, List<(ejoValueType value, bool optional)> args)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("(" + profile);
            foreach (var item in args)
                sb.Append(" " + item.value.ToString(item.optional));
            return sb.ToString() + ")";
        }
        public string vlaSignatureBuilder(string profile, params ejoValueType[] args)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("(" + profile);
            foreach (var item in args)
                sb.Append(" " + item.ToString());
            return sb.ToString() + ")";
        }

        public string lspSignatureBuilder(SigSegment obj, string sig, List<ejoValueType> args)
        {
            sig = sig.Normalization().Replace("...", " ...").Replace("( ", "(").Replace("[ ", "[").Replace(" (", "(").Replace(" [", "[").Replace("] [", "][");
            int qty = 0, find = 0; // find is actually a char

            for (int i = 0; i < sig.Length; i++)
            {
                if (find == 0) // not searching for suffix
                {
                    if (sig[i] == ' ' && obj.Prefix == "")
                        continue;
                    else if (sig[i] == ' ')
                        find = 1;
                    else if (sig[i] == '[' && obj.Prefix == "")
                    { find = ']'; qty = 1; obj.Prefix = "["; continue; }
                    else if (sig[i] == '[')
                        find = 1; // let it just collect the rest into the _child
                    else if (sig[i] == '(' && obj.Prefix == "")
                    { find = ')'; qty = 1; obj.Prefix = "("; continue; }
                    else if (sig[i] == '(')
                        find = 1; // let it just collect the rest into the _child
                    obj.Add(ref find, sig[i]);
                }
                else if (find == 1) // purely collecting, but doesn't collect spaces, it will spawn another 
                    obj.Add(ref find, sig[i]);
                else if (find > 1) // is searching for suffix
                {
                    if (sig[i] == find && qty == 1)
                    {
                        obj.Suffix += (char)find;
                        obj.Child = new SigSegment();
                        find = 0;
                        obj.Reset(lspSignatureBuilder(obj.Child, obj._child, args));
                        continue;
                    }
                    else if (sig[i] == find && qty > 1)
                        qty--;
                    else if (find == ']' && sig[i] == '[')
                        qty++;
                    else if (find == ')' && sig[i] == '(')
                        qty++;
                    obj.Add(ref find, sig[i]);
                }
            }
            if (obj.Child == null && obj._child != "")
            {
                obj.Child = new SigSegment();
                lspSignatureBuilder(obj.Child, obj._child, args);
            }
            string result = obj.ToString(args).Normalization().Replace(" ...", "...").Replace("( ", "(").Replace(" )", ")").Replace("[ ", "[").Replace(" ]", "]");
            foreach (ejoValueType arg in args)
            {
                var argValue = arg.ToString();
                result = result.Replace(argValue + " " + argValue, argValue).Replace("[" + argValue, arg.ToString(true));
            }

            return result;
        }

        public string lspSignatureBuilderFinalCleanup(string str)
        {
            var optionalStart = Regex.Match(str, @"\w\?<").Index;
            if (optionalStart > 1)
                while (Regex.Matches(str, @"\w<").Find(p => p.Index > optionalStart) != null)
                    str = str.Insert(Regex.Matches(str, @"\w<").Find(p => p.Index > optionalStart).Index + 1, "?");
            return str.Replace("[", " ").Replace("]", " ").Normalization().Replace(" )", ")").Replace(" or ", " || ").Replace(" | ", " || ").Replace(" .<", " . <").Replace(">) (vlax", "> || vlax");
        }
    }

    public class SigSegment
    {
        public string Prefix { get; set; } = "";
        public string Suffix { get; set; } = "";
        public string _child { get; set; } = "";
        public SigSegment Child { get; set; } = null;
        public SigSegment() { }
        public SigSegment(string value, string suf, SigSegment seg) { Prefix = value; Suffix = suf; Child = seg; }


        public void Add(ref int state, char ch)
        {
            if (state == 0)
                Prefix += ch;
            else
                _child += ch;
        }


        public void Reset(string pref)
        {
            this.Prefix = this.Prefix + pref + this.Suffix;
            this.Suffix = "";
            this._child = "";
            this.Child = null;
        }


        public override string ToString()
        { return Prefix + (Child != null ? Child.ToString() : "") + Suffix; }
        public string ToString(List<ejoValueType> values)
        {
            StringBuilder sb = new StringBuilder();
            if (values.Find(p => p.id.ToUpper() == Prefix.ToUpper()) != null)
                sb.Append(" " + values.Find(p => p.id.ToUpper() == Prefix.ToUpper()).ToString());
            else if (values.Find(p => p.id.ToUpper() == Prefix.ToUpper().Replace("_N", "")) != null)
                sb.Append(" " + values.Find(p => p.id.ToUpper() == Prefix.ToUpper().Replace("_N", "")).ToString());
            else if (values.Find(p => p.id.ToUpper() == Prefix.ToUpper().Replace("\'", "")) != null)
                sb.Append(" " + values.Find(p => p.id.ToUpper() == Prefix.ToUpper().Replace("\'", "")).ToString());
            else if (values.Find(p => p.id.ToUpper() == Prefix.ToUpper().Replace(":", "")) != null)
                sb.Append(" " + values.Find(p => p.id.ToUpper() == Prefix.ToUpper().Replace(":", "")).ToString());
            else
                sb.Append(" " + Prefix);
            if (Child != null)
            {
                if (values.Find(p => p.id.ToUpper() == Child.ToString().ToUpper()) != null)
                    sb.Append(" " + values.Find(p => p.id.ToUpper() == Child.ToString().ToUpper()).ToString());
                else
                    sb.Append(" " + Child.ToString(values));
            }
            if (values.Find(p => p.id.ToUpper() == Suffix.ToUpper()) != null)
                sb.Append(" " + values.Find(p => p.id.ToUpper() == Suffix.ToUpper()).ToString());
            else
                sb.Append(" " + Suffix);
            return sb.ToString();
        }
    }


    class ScrapeDocument
    {
        public List<ejoHelpEntity> items = new List<ejoHelpEntity>();
        public string Path { get; set; }
        public LinkObject Source { get; set; }
        public string jsonString { get; set; } = "";
        private HAP.HtmlDocument doc = new HAP.HtmlDocument();
        private ScrapeDocumentDeconstructor template;

        public ScrapeDocument(string path, LinkObject source) { Path = path; Source = source; readDocument(path, Source); }
        public override string ToString() { return Source.title; }


        public void readDocument(string filePath, LinkObject source)
        {
            Path = filePath;
            doc.LoadHtml(System.IO.File.ReadAllText(filePath));
            template = new ScrapeDocumentDeconstructor(doc.DocumentNode);
            switch (source.category)
            {
                case linkCategory.Event:
                    items.Add(parseEventPage());
                    break;
                case linkCategory.Object:
                    items.Add(parseObjectPage());
                    break;
                case linkCategory.Method:
                    items.AddRange(parseMethodPage());
                    break;
                case linkCategory.Property:
                    items.AddRange(parsePropertyPage());
                    break;
                case linkCategory.Function:
                    items.AddRange(parseFunctionPage());
                    break;
                case linkCategory.DclTile:
                    items.Add(parseDclTilePage());
                    break;
                case linkCategory.DclAttribute:
                    items.Add(parseDclAttPage());
                    break;
            }
        }

        
        public ejoObject parseObjectPage()
        {
            var tableContents = ScrapeDocumentDeconstructor.getTableValues(template.ntable);
            var result = new ejoObject()
            {
                category = ejoCategory.OBJECT,
                description = template.Description,
                guid = Source.guid,
                id = template.getProfile(ejoCategory.OBJECT, false),
                methods = tableContents.methods,
                properties = tableContents.properties,
                platforms = template.Platforms
            };
            jsonString = result.toJSON(Newtonsoft.Json.Formatting.Indented);
            return result;
        }

        
        public ejoEvent parseEventPage()
        {
            var result = new ejoEvent()
            {
                category = ejoCategory.EVENT,
                description = template.Description,
                guid = Source.guid,
                id = template.getProfile(ejoCategory.EVENT, false),
                platforms = template.Platforms
            };
            jsonString = result.toJSON(Newtonsoft.Json.Formatting.Indented);
            return result;
        }

        
        public ejoTile parseDclTilePage()
        {
            var result = new ejoTile()
            {
                category = ejoCategory.DCLTILE,
                description = template.Description,
                guid = Source.guid,
                id = template.getProfile(ejoCategory.DCLTILE, false),
                platforms = template.Platforms,
                signature = template.DclSignature,
                attributes = template.DclSignature.splitByAnyChar(": {}").Skip(1).ToArray(),
            };
            jsonString = result.toJSON(Newtonsoft.Json.Formatting.Indented);
            return result;
        }

        
        public ejoAttribute parseDclAttPage()
        {
            string[] sig = template.DclSignature.ToUpper().Split('=');
            ejoValueType vtype = ejoValueType.nil();
            if (sig[1].Contains("TRUE") == true)
                vtype = new ejoValueType() { id = sig[0].Trim().ToLower(), typeNames = "True|False", primitive = "boolean" };
            else if (sig[1].Contains("REAL") == true || sig[1].Contains("NUMBER") == true)
                vtype = new ejoValueType() { id = sig[0].Trim().ToLower(), typeNames = "Number", primitive = "real" };
            else if (sig[1].Contains("INTEGER") == true || sig[1].Contains("COLORNAME") == true)
                vtype = new ejoValueType() { id = sig[0].Trim().ToLower(), typeNames = "Number", primitive = "integer" };
            else if (sig[1].Contains("STRING") == true || sig[1].Contains("CHAR") == true)
                vtype = new ejoValueType() { id = sig[0].Trim().ToLower(), typeNames = "string", primitive = "string" };
            else if (sig[1].Contains("FUNCTION") == true)
                vtype = new ejoValueType() { id = sig[0].Trim().ToLower(), typeNames = "LispExpression", primitive = "string" };
            else if (template.Title.ToUpper() == "LAYOUT")
                vtype = new ejoValueType() { id = sig[0].Trim().ToLower(), typeNames = sig[1].Trim().Trim(';').ToLower(), primitive = "enum", enums = new string[] { "horizontal", "vertical" } };
            else
                vtype = new ejoValueType() { id = sig[0].Trim().ToLower(), typeNames = sig[1].Trim().Trim(';').ToLower(), primitive = "enum", enums = new string[] { "left", "right", "top", "bottom", "centered" } };
            var result = new ejoAttribute()
            {
                category = ejoCategory.DCLATT,
                description = template.Description,
                guid = Source.guid,
                id = template.getProfile(ejoCategory.DCLATT, false),
                platforms = template.Platforms,
                signature = template.DclSignature,
                valueType = vtype
            };
            jsonString = result.toJSON(Newtonsoft.Json.Formatting.Indented);
            return result;
        }

        
        public List<ejoFunction> parsePropertyPage()
        {
            HAP.HtmlNode sigNode = template.signatureHeaders.First();
            string types = sigNode.getDoc().SelectNodes(sigNode.ParentNode.XPath + "//p").ToList().Find(p => p.InnerText.getLetters().StartsWith("TYPE")).InnerText.Normalization();
            var obj = new ejoValueType("Object", types, null, linkCategory.Object);

            HAP.HtmlNode retNode = template.returnValHeaders.First();
            HAP.HtmlNode ulNode = retNode.getDoc().SelectSingleNode(retNode.ParentNode.XPath + "//ul");
            string readonlyValue = retNode.nextRealSibling().InnerText.getLetters();
            string typeValue = string.Join(", ", retNode.nextRealSibling().nextRealSibling().InnerText.Normalization().splitByAnyChar(" ,"));

            var outVal = new ejoValueType("Return", typeValue, ulNode, linkCategory.Property);
            var inVal = new ejoValueType("NewValue", typeValue, ulNode, linkCategory.Property);

            bool isReadOnly = false;
            if (readonlyValue.Contains("READONLYYES") && readonlyValue.Contains("EXCEPT") == false)
                isReadOnly = true;

            List<ejoFunction> result = new List<ejoFunction>();
            result.Add( // make the vla-getter
                    new ejoFunction()
                    {
                        category = ejoCategory.PROPGETTER,
                        description = template.Description,
                        guid = Source.guid,
                        id = template.getProfile(ejoCategory.PROPGETTER, false),
                        platforms = template.Platforms,
                        validObjects = obj.typeNames.splitByAnyChar(",").ToArray(),
                        arguments = new ejoValueType[] { obj },
                        returnType = outVal,
                        signature = template.vlaSignatureBuilder(template.getProfile(ejoCategory.PROPGETTER, false), obj)
                    });
            if (isReadOnly == false) // make the vla-setter
            {
                result.Add(
                    new ejoFunction()
                    {
                        category = ejoCategory.PROPSETTER,
                        description = template.Description,
                        guid = Source.guid,
                        id = template.getProfile(ejoCategory.PROPSETTER, false),
                        platforms = template.Platforms,
                        validObjects = obj.typeNames.splitByAnyChar(",").ToArray(),
                        arguments = new ejoValueType[] { obj, inVal },
                        returnType = ejoValueType.nil("Return"),
                        signature = template.vlaSignatureBuilder(template.getProfile(ejoCategory.PROPSETTER, false), obj, inVal)
                    });
            }
            jsonString += result.toJSON(Newtonsoft.Json.Formatting.Indented);
            return result;
        }


        public List<ejoFunction> parseMethodPage()
        {
            List<ejoFunction> result = new List<ejoFunction>();
            for (int j = 0; j < template.signatureHeaders.Count; j++)
            {
                HAP.HtmlNode sigNode = template.signatureHeaders[j];
                string sigValue = sigNode.getDoc().SelectSingleNode(sigNode.ParentNode.XPath + "//pre").InnerText.Normalization();
                HAP.HtmlNode dlNode = sigNode.getDoc().SelectSingleNode(sigNode.ParentNode.XPath + "//dl");
                List<(ejoValueType value, bool optional)> args = ejoValueType.extractVlaArguments(dlNode, sigValue, linkCategory.Method);

                HAP.HtmlNode retNode = j < template.returnValHeaders.Count ? template.returnValHeaders[j] : template.returnValHeaders[0];
                HAP.HtmlNode rTypeNode = retNode.nextRealSibling();
                string typeValue = rTypeNode == null ? "nil" : rTypeNode.InnerText.Normalization();
                ejoValueType returnType = new ejoValueType("Return", typeValue, null, linkCategory.Method);

                result.Add(
                        new ejoFunction()
                        {
                            category = ejoCategory.METHOD,
                            description = template.Description,
                            guid = Source.guid,
                            id = template.getProfile(ejoCategory.METHOD, false), /// wondering if this should be true
                            platforms = template.Platforms,
                            validObjects = args[0].value.typeNames.splitByAnyChar(",").ToArray(),
                            arguments = args.Select(p => p.value).ToArray(),
                            returnType = returnType,
                            signature = template.vlaSignatureBuilder(template.getProfile(ejoCategory.METHOD, false), args)
                        });
            }
            jsonString += result.toJSON(Newtonsoft.Json.Formatting.Indented);
            return result;
        }


        public List<ejoFunction> parseFunctionPage()
        {
            HAP.HtmlNode sigNode = template.signatureHeaders[0];
            string sigValue = sigNode.getDoc().SelectSingleNode(sigNode.ParentNode.XPath + "//pre").InnerText.Normalization();
            HAP.HtmlNode dlNode = sigNode.getDoc().SelectSingleNode(sigNode.ParentNode.XPath + "//dl");
            List<ejoValueType> args = ejoValueType.extractFuncArguments(dlNode, template.getProfile(ejoCategory.FUNCTION, true));

            HAP.HtmlNode retNode = template.returnValHeaders[0];
            HAP.HtmlNode rTypeNode = retNode.nextRealSibling();
            string typeValue = rTypeNode == null ? "nil" : rTypeNode.InnerText.Normalization();
            ejoValueType returnType = new ejoValueType("Return", typeValue, retNode, template.getProfile(ejoCategory.FUNCTION, true));

            List<ejoFunction> result = new List<ejoFunction>();

            string preSig = template.lspSignatureBuilderFinalCleanup(template.lspSignatureBuilder(new SigSegment(), sigValue, args.ToList()));
            string finalSig = preSig;
            if (preSig.Contains("||") == true) // isAmbFunc
            {
                var orParts = preSig.Split(new string[] { "||" }, StringSplitOptions.None);
                preSig = orParts[0].Trim() + ")";
                finalSig = orParts[0].splitByAnyChar(" ")[0] + " " + orParts[1].Trim();
                result.Add(new ejoFunction()
                {
                    category = ejoCategory.FUNCTION,
                    description = template.Description,
                    guid = Source.guid,
                    id = template.getProfile(ejoCategory.FUNCTION, false), /// wondering if this should be true
                    platforms = template.Platforms,
                    validObjects = new string[] { },
                    arguments = args.Where(p => finalSig.Contains(" " + p.id + "<") || finalSig.Contains(" " + p.id + "?<")).ToArray(),
                    returnType = returnType,
                    signature = finalSig
                });
                args = args.Where(p => preSig.Contains(" " + p.id + "<") || preSig.Contains(" " + p.id + "?<")).ToList();
            }
            result.Add(new ejoFunction()
            {
                category = ejoCategory.FUNCTION,
                description = template.Description,
                guid = Source.guid,
                id = template.getProfile(ejoCategory.FUNCTION, false), /// wondering if this should be true
                platforms = template.Platforms,
                validObjects = new string[] { },
                arguments = args.ToArray(),
                returnType = returnType,
                signature = preSig
            });
            
            jsonString = result.toJSON(Newtonsoft.Json.Formatting.Indented);
            return result;
        }

    } // end class ScrapeDocument

    #endregion

} // end namespace 
