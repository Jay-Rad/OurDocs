using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

/// <summary>
/// Summary description for DocumentEntry
/// </summary>
public class DocumentEntry
{
    public DocumentEntry()
    {

    }
    public DocumentEntry(string DocID, string DocName)
    {
        this.DocumentID = DocID;
        this.DocumentName = DocName;
    }
    public string DocumentID { get; set; }
    public string DocumentName { get; set; }
}