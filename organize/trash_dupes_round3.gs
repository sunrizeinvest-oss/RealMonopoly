/* trash_dupes_round3.gs — Google Docs/Sheets dupes
 */
function trashDupes3() {
  const items = [{"id": "1M6EtQaguBzc6ynoh4OR5lUqvHa8NPsk3QUdGfCto7jY", "title": "Allendale_6408_5-Plex_BTY_Draft"}, {"id": "1kt9mfBx4bDYeV349-lD0CIzU6w0RV_3sa-crXDbvdbw", "title": "Allendale_6408_5-Plex_BTY_Draft"}, {"id": "1KW56WWZgWZcOugubdYNxuHvNc9ohpPG5j7mEbjDvT0w", "title": "Allendale_6408_5-Plex_BTY_Draft"}, {"id": "1D6dJ4vqK8JK9GrTXBVli8F0_i77AA-OELlPzfkp-gj0", "title": "Allendale_6408_Cost_Overview_-_FINAL"}, {"id": "1PY5AjgOI0RjR6WxPpJmy6xyKG9iPdb9yg_MaVYkoHRY", "title": "CONSULTANT AGREEMENT"}, {"id": "1ALOw_uM4Na0rERk73Ht4nZUPzsdEF_TI", "title": "Derelict 2025 "}, {"id": "1O_oA37S7nUAqmvO_PywdNrLB0dzSZAKP", "title": "Multi Family mood baord"}, {"id": "19BnlfmvOSyDFA0eBEaK02Jy-VcKT_nlCJw4zSEADWEE", "title": "Untitled document"}, {"id": "1q_zRmJp5IIcnSbtJR-Z3qjN7W7EX7LdMNR8nH5r_4DY", "title": "Untitled document"}, {"id": "1Lmg8Jw3kMhF7xy4LudksaswdX4eM0JcBZXv2c0I6X1M", "title": "Untitled document"}, {"id": "1zJmzx94PtAyRw8fMj2-e8tD8mP_c-Fq2insZRcIxdwM", "title": "Untitled document"}, {"id": "1Iz2VwiGU6EkXihWsZOM0KBRVCs44LgNzq6d4QX-3vRo", "title": "Untitled spreadsheet"}, {"id": "1JdTmET2ZWeCxxHESSjnUlLopP4Gt50UXE0s5riw0nOQ", "title": "Untitled spreadsheet"}, {"id": "10SktCBiS00Fee7lMnX7jE4OFpQmGVMaJR3O2OlZZ7TI", "title": "sunrize_investments_real_estate_agreement"}];
  let trashed=0, skipped=0, errored=0;
  for (let i=0; i<items.length; i++) {
    try {
      const f = DriveApp.getFileById(items[i].id);
      if (f.isTrashed()) { skipped++; continue; }
      f.setTrashed(true);
      trashed++;
      Logger.log("✓ trashed: " + items[i].title);
    } catch(e) {
      errored++;
      Logger.log("⚠ " + items[i].title + ": " + e);
    }
  }
  Logger.log("DONE. trashed=%s, already-trashed=%s, errored=%s, total=%s", trashed, skipped, errored, items.length);
}

function restoreRound3() {
  const ids = ["1M6EtQaguBzc6ynoh4OR5lUqvHa8NPsk3QUdGfCto7jY", "1kt9mfBx4bDYeV349-lD0CIzU6w0RV_3sa-crXDbvdbw", "1KW56WWZgWZcOugubdYNxuHvNc9ohpPG5j7mEbjDvT0w", "1D6dJ4vqK8JK9GrTXBVli8F0_i77AA-OELlPzfkp-gj0", "1PY5AjgOI0RjR6WxPpJmy6xyKG9iPdb9yg_MaVYkoHRY", "1ALOw_uM4Na0rERk73Ht4nZUPzsdEF_TI", "1O_oA37S7nUAqmvO_PywdNrLB0dzSZAKP", "19BnlfmvOSyDFA0eBEaK02Jy-VcKT_nlCJw4zSEADWEE", "1q_zRmJp5IIcnSbtJR-Z3qjN7W7EX7LdMNR8nH5r_4DY", "1Lmg8Jw3kMhF7xy4LudksaswdX4eM0JcBZXv2c0I6X1M", "1zJmzx94PtAyRw8fMj2-e8tD8mP_c-Fq2insZRcIxdwM", "1Iz2VwiGU6EkXihWsZOM0KBRVCs44LgNzq6d4QX-3vRo", "1JdTmET2ZWeCxxHESSjnUlLopP4Gt50UXE0s5riw0nOQ", "10SktCBiS00Fee7lMnX7jE4OFpQmGVMaJR3O2OlZZ7TI"];
  let n = 0;
  for (const id of ids) {
    try { const f = DriveApp.getFileById(id); if (f.isTrashed()) { f.setTrashed(false); n++; } } catch(e){}
  }
  Logger.log("restored %s", n);
}
