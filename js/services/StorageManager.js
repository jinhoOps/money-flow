/**
 * StorageManager.js
 * Handles LocalStorage interactions.
 */

const STORAGE_KEY = 'money_flow_v2';

export class StorageManager {
    save(model) {
        localStorage.setItem(STORAGE_KEY, model.serialize());
    }

    load(model) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            model.deserialize(raw);
            return true;
        }
        return false;
    }
    
    // Backup helper
    exportToFile(model) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(model.serialize());
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "money_flow_backup_" + new Date().toISOString().slice(0,10) + ".json");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    importFromFile(file, model, callback) {
        const reader = new FileReader();
        reader.onload = (event) => {
            model.deserialize(event.target.result);
            callback();
        };
        reader.readAsText(file);
    }
}
