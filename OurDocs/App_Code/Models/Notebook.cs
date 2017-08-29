using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Web;

/// <summary>
/// Summary description for Notebook
/// </summary>
namespace OurDocs.Models
{
    public class Notebook
    {
        public Notebook()
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
                NotebookID = newID;
            }
            while (File.Exists(HttpContext.Current.Server.MapPath(@"/App_Data/Notebooks/" + newID + ".json")));
            Documents = new List<DocumentEntry>();
            ChatMessages = new List<string>();
        }

        public string NotebookID { get; set; }
        public List<DocumentEntry> Documents { get; set; }
        public List<string> ChatMessages { get; set; }
        public string PIN { get; set; }
        public bool IsPinSet
        {
            get
            {
                if (PIN == null)
                {
                    return false;
                }
                else
                {
                    return true;
                }
            }
        }
        public string Password { get; set; }
        public bool IsPasswordSet
        {
            get
            {
                if (Password == null)
                {
                    return false;
                }
                else
                {
                    return true;
                }
            }
        }
        public string Email { get; set; }
        public bool IsEmailSet
        {
            get
            {
                if (Email == null)
                {
                    return false;
                }
                else
                {
                    return true;
                }
            }
        }
        public double ActiveUsers { get; set; }

    }
}