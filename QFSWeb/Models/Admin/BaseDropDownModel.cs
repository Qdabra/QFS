using System.Collections.Generic;
using System.Linq;
using System.Web.Mvc;

namespace QFSWeb.Models
{
    public class BaseDropDownModel
    {
        public bool IsPascalCase { get; set; }

        public IEnumerable<string> DataList { get; set; }

        public IEnumerable<SelectListItem> DataSource
        {
            get
            {
                if (DataList == null || !DataList.Any())
                {
                    return new List<SelectListItem> { new SelectListItem() };
                }

                return DataList
                    .Select(c => IsPascalCase ? c.ToPascalCase() : c)
                    .Select(c =>
                        new SelectListItem
                        {
                            Text = c == "-1" ? "None" : c,
                            Value = c
                        });
            }
        }

        public string Item { get; set; }

        public string ControlClass { get; set; }

        public BaseDropDownModel()
        {

        }

        public BaseDropDownModel(IEnumerable<string> dataList, string controlClass, bool isPascal = false, string item = null)
        {
            ControlClass = controlClass;
            DataList = dataList;
            IsPascalCase = isPascal;
            Item = item;
        }
    }
}