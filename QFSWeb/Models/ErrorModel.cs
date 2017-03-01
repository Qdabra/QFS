
using System;
using Microsoft.Ajax.Utilities;

namespace QFSWeb.Models
{
    public class ErrorModel
    {
        public string ErrorMessage { get; set; }

#if DEBUG
        public string Stack { get; set; }
#endif

        public ErrorModel InnerError { get; set; }

        internal static ErrorModel FromException(Exception e)
        {
            return new ErrorModel
            {
                ErrorMessage = e.Message,
#if DEBUG
                Stack = e.StackTrace,
#endif
                InnerError = e.InnerException.IfNotNull(ie => FromException(ie))
            };
        }
    }
}
