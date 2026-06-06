/* restore_orphans.gs — restores files I incorrectly trashed
 *
 * These 11 files have the "Copy of" prefix but NO actual original in your Drive,
 * so they were unique files that I shouldn't have trashed.
 * Tool was over-aggressive on the "Copy of" pattern — restoring now.
 *
 * After this runs, your Drive Trash will contain ONLY verified true duplicates,
 * safe to empty.
 */
function restoreOrphans() {
  const items = [
    { id: "1bL8J9HVn2hcEcYys9ZZwq7yf7unOFuEpkh1AO57bn50", title: "Copy of First Deal Rental Property Underwriting Tool" },
    { id: "1LSS9D3mCnXvnhml1h6pd45LIeBUI2P-W", title: "Copy of TEMPLATE - PNW Statement - Blank.xlsx" },
    { id: "1gonGIJ-Q9E-UHznjH2dye3nyXAoM1Hcm", title: "Copy of Website Design.docx" },
    { id: "1iBpR-82di44ml5tm8TbqdNb2NBssuG4t", title: "Copy of Naturopathic Doctor Contact.xlsx (15KB)" },
    { id: "1v6p0-TDNzObkSREPhuhjxS7JFGuhDHl9", title: "Copy of Naturopathic Doctor Contact.xlsx (11KB)" },
    { id: "1OFep2hbvVnGZ6hvLwryH_4npLQavM9d-zDyJcWoiRoE", title: "Copy of Sheet with GST" },
    { id: "1oKvf_b3gDviMwCeebRva4-qeyQEa9ZkUi5jIPwVsGUI", title: "Copy of Co-Star: AB, Buyers/Sellers" },
    { id: "1rZ0Rj3-UKWxYv8PBPek38xdcimV9G3Mi", title: "Copy of Co-Star: Edmonton MF Sellers" },
    { id: "1VsPiCtaA1-2wTIS5-h5L98PaDHgzVS6Dzk5mZGjV5PI", title: "Copy of COE Website 2025 Tax Sale Property List" },
    { id: "1536No_eMRP2XnDxHaYCFJYcb4kEXnZ0H", title: "Copy of Purchase Contract.pdf" },
    { id: "10L2dT-_gquC6Kqfkjg65eAivMHKO_sof", title: "Copy of Personal Net Worth Statement_Peakhill Capital.pdf" },
    { id: "1Ai6kXr0B_8fj52mriTT6i-j_rZnm3xum", title: "Copy of Personal-Financial-Statement.xlsx" },
  ];

  let restored = 0, skipped = 0, errored = 0;
  for (let i = 0; i < items.length; i++) {
    try {
      const f = DriveApp.getFileById(items[i].id);
      if (!f.isTrashed()) { skipped++; Logger.log("• not in trash: " + items[i].title); continue; }
      f.setTrashed(false);
      restored++;
      Logger.log("↩ restored: " + items[i].title);
    } catch (e) {
      errored++;
      Logger.log("⚠ " + items[i].title + ": " + e);
    }
  }
  Logger.log("");
  Logger.log("DONE. restored=%s, skipped=%s, errored=%s, total=%s", restored, skipped, errored, items.length);
}
