using System;

namespace QFSWeb.Models
{
    public class CustomerChartModel
    {
        public int Month { get; set; }

        public int Year { get; set; }

        public int Opens { get; set; }

        public string Customer { get; set; }

        public DateTime Date
        {
            get
            {
                return new DateTime(Year, Month, 1);
            }
        }
    }
}