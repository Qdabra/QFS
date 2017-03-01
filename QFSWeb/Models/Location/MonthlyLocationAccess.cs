using System;
using System.Data.SqlClient;

namespace QFSWeb.Models
{
    public class MonthlyLocationAccess
    {
        public string Location { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public int Opens { get; set; }

        public MonthlyLocationAccess()
        {

        }

        public MonthlyLocationAccess(SqlDataReader reader)
        {
            if (reader == null || !reader.HasRows)
            {
                return;
            }

            Location = Convert.ToString(reader["Location"]);
            Year = Convert.ToInt32(reader["Year"]);
            Month = Convert.ToInt32(reader["Month"]);
            Opens = Convert.ToInt32(reader["Opens"]);
        }
    }
}