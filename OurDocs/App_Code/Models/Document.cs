using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;

/// <summary>
/// Summary description for Document
/// </summary>
namespace OurDocs.Models
{
    public class Document
    {
        public Document()
        {
            var id = (System.IO.Path.GetRandomFileName() + System.IO.Path.GetRandomFileName()).Replace(".", "");
            var newID = "";

            do
            {
                foreach (var character in id)
                {
                    if (new Random(character.GetHashCode()).NextDouble() > .5)
                    {
                        newID += character.ToString().ToUpper();
                    }
                    else
                    {
                        newID += character.ToString();
                    }
                }
                DocumentID = newID;
            }
            while (File.Exists(HttpContext.Current.Server.MapPath(@"/App_Data/OurDocs/Documents/" + newID + ".json")));
        }
        public string NotebookID { get; set; }
        public string DocumentID { get; set; }
        public string DocumentName { get; set; }
        public string Contents { get; set; }
    }
}