# DLC System Testing Guide

## Prerequisites

1. **Admin Website Running**
   ```bash
   cd "D:\Dev\VR Centre\RolePlayAI_Admin"
   npm run dev
   ```
   Access at: `http://localhost:5173` (or the port Vite assigns)

2. **Launcher Running**
   ```bash
   cd "D:\Dev\VR Centre\RolePlayAI_Launcher"
   npm start
   ```

3. **Firebase Configuration**
   - Ensure Firebase is properly configured in both projects
   - Admin website should have Firebase credentials in `.env.local`
   - Launcher should have Firebase credentials (or use environment variables)

4. **Test Game Installation**
   - Have a game installed at a known path (e.g., `C:\Builds\Windows`)
   - The game should have a `RolePlay_AI\Plugins\` folder structure

## Testing Workflow

### Phase 1: Admin Website - Create DLCs

#### Test 1: Create Environment DLC
1. Open Admin website and log in
2. Select an app (e.g., "RolePlayAI")
3. Navigate to **"Additional Content"** tab
4. Click **"Add DLC"** button
5. Fill in the form:
   - **Name**: `Hospital Environment`
   - **Type**: `Environment (Level 1)`
   - **Version**: `1.0.0`
   - **Manifest URL**: `https://pub-f87e49b41fad4c0fad84e94d65ed13cc.r2.dev/DLC_Hospital/v1.0.0/manifest.json`
   - **Folder Name**: `DLC_Hospital`
   - **Description**: `Hospital environment DLC`
   - **Enabled**: ✓ (checked)
6. Click **"Create DLC"**
7. **Expected**: DLC appears in the list under "Environments (Level 1 DLC)"

#### Test 2: Create Character DLC
1. Click **"Add DLC"** again
2. Fill in the form:
   - **Name**: `Rachael Character`
   - **Type**: `Character (Level 2)`
   - **Parent Environment**: Select "Hospital Environment" from dropdown
   - **Version**: `1.0.0`
   - **Manifest URL**: `https://pub-f87e49b41fad4c0fad84e94d65ed13cc.r2.dev/DLC_Hospital_Rachael/v1.0.0/manifest.json`
   - **Folder Name**: `DLC_Hospital_Rachael`
   - **Description**: `Rachael character for Hospital environment`
   - **Enabled**: ✓ (checked)
3. Click **"Create DLC"**
4. **Expected**: 
   - DLC appears nested under "Hospital Environment"
   - Shows as a child in the hierarchical view

#### Test 3: Validation Tests
1. Try creating a Character DLC without selecting a parent:
   - **Expected**: Error message "Parent environment is required for character DLCs"
2. Try creating a DLC with invalid folder name (contains spaces/special chars):
   - **Expected**: Error message "Folder name can only contain letters, numbers, and underscores"
3. Try creating a DLC with invalid manifest URL:
   - **Expected**: Error message "Invalid URL format"

#### Test 4: Edit DLC
1. Click the **Edit** button (pencil icon) on an existing DLC
2. Modify the description
3. Click **"Update DLC"**
4. **Expected**: Changes are saved and reflected in the list

#### Test 5: Disable/Enable DLC
1. Edit a DLC
2. Toggle the **Enabled** switch to OFF
3. Save
4. **Expected**: DLC shows "Disabled" badge
5. Toggle back to ON
6. **Expected**: DLC shows as active

#### Test 6: Delete DLC
1. Try deleting a Character DLC:
   - **Expected**: Deletes successfully
2. Try deleting an Environment DLC that has Characters:
   - **Expected**: Warning dialog asking to confirm (will also delete dependent characters)
   - Confirm deletion
   - **Expected**: Both Environment and its Characters are deleted

### Phase 2: Launcher - Download & Install DLCs

#### Test 7: View DLCs in Launcher
1. Open the Launcher
2. Select a game that has DLCs configured
3. **Expected**: 
   - "Additional Content" section appears below the main game info
   - Shows hierarchical structure:
     ```
     Base App [Always Installed]
     ├─ Hospital Environment [Install]
     │  └─ Rachael Character [Install] (disabled - parent not installed)
     ```

#### Test 8: Install Environment DLC
1. Click **"Install"** on an Environment DLC
2. **Expected**:
   - Download progress appears
   - Files are downloaded using chunk-based CDC method
   - Files are placed in: `{gamePath}/RolePlay_AI/Plugins/DLC_Hospital/`
   - Button changes to "Installed" or "Uninstall"
   - Character DLCs under it become enabled

#### Test 9: Install Character DLC (with parent installed)
1. After installing the parent Environment:
   - **Expected**: Character DLC "Install" button becomes enabled
2. Click **"Install"** on the Character DLC
3. **Expected**:
   - Download starts
   - Files placed in: `{gamePath}/RolePlay_AI/Plugins/DLC_Hospital_Rachael/`
   - Installation completes successfully

#### Test 10: Dependency Validation
1. Try installing a Character DLC without installing its parent Environment:
   - **Expected**: 
     - Button is disabled
     - Or shows error: "Parent Environment must be installed first"
2. Uninstall the parent Environment while Character is installed:
   - **Expected**: 
     - Warning dialog: "Cannot uninstall: X character DLC(s) depend on this environment"
     - Or automatically uninstalls dependent Characters

#### Test 11: Verify DLC Installation
1. Click **"Verify"** button on an installed DLC
2. **Expected**:
   - Verification process runs
   - Shows success message if files are valid
   - Shows error with missing/corrupted files if issues found

#### Test 12: Uninstall DLC
1. Click **"Uninstall"** on a Character DLC
2. **Expected**:
   - Confirmation dialog appears
   - Folder is deleted from Plugins directory
   - Status updates to "Not Installed"
3. Try uninstalling an Environment with installed Characters:
   - **Expected**: 
     - Warning about dependent Characters
     - Option to proceed (will uninstall Characters too)

### Phase 3: File System Verification

#### Test 13: Verify File Placement
1. After installing DLCs, check the file system:
   ```
   C:\Builds\Windows\RolePlay_AI\Plugins\
   ├── DLC_Hospital\
   │   ├── [DLC files]
   │   └── manifest.json (if included)
   └── DLC_Hospital_Rachael\
       ├── [Character files]
       └── manifest.json (if included)
   ```
2. **Expected**: 
   - Folders exist with correct names
   - Files are present and match manifest structure

#### Test 14: Verify State Persistence
1. Install some DLCs
2. Close and restart the Launcher
3. **Expected**: 
   - DLC installation status is preserved
   - Shows correct "Installed" status for previously installed DLCs

### Phase 4: Edge Cases & Error Handling

#### Test 15: Invalid Manifest URL
1. Create a DLC with a manifest URL that doesn't exist
2. Try to install it
3. **Expected**: Error message about manifest not found

#### Test 16: Network Issues
1. Disconnect internet
2. Try to install a DLC
3. **Expected**: Appropriate error message about network failure

#### Test 17: Insufficient Disk Space
1. Fill up the target drive
2. Try to install a DLC
3. **Expected**: Error message about insufficient space

#### Test 18: Corrupted Download
1. Manually corrupt a file in a DLC folder
2. Run verification
3. **Expected**: Verification detects corrupted file and reports it

### Phase 5: Integration Testing

#### Test 19: Full Workflow
1. **Admin**: Create Environment DLC → Save
2. **Launcher**: Refresh → See new DLC → Install
3. **Admin**: Create Character DLC (child of Environment) → Save
4. **Launcher**: Refresh → See Character DLC → Install (should work now)
5. **File System**: Verify all files in correct locations
6. **Launcher**: Verify both DLCs → Both pass
7. **Launcher**: Uninstall Character → Verify folder deleted
8. **Launcher**: Uninstall Environment → Verify folder deleted

#### Test 20: Multiple Environments & Characters
1. Create multiple Environments (Hospital, Office, etc.)
2. Create multiple Characters for each Environment
3. **Expected**: 
   - All display correctly in hierarchical view
   - Each can be installed independently
   - Dependencies are properly enforced

## Debugging Tips

### Check Browser Console (Admin Website)
- Open DevTools (F12)
- Look for Firebase errors
- Check for validation errors

### Check Launcher Console
- Open DevTools in Electron (Ctrl+Shift+I)
- Look for IPC errors
- Check download progress logs

### Check DLC State File
- Location: `%APPDATA%\RolePlayAI_Launcher\dlc-state.json`
- Contains installation status of all DLCs

### Check Firebase Firestore
- Go to Firebase Console
- Navigate to Firestore Database
- Check `apps/{appId}` document
- Verify `dlcs` object structure

## Common Issues & Solutions

### Issue: DLCs not showing in Launcher
- **Solution**: 
  - Check Firebase connection
  - Verify DLCs are marked as `enabled: true`
  - Check browser console for errors
  - Verify appId matches between Admin and Launcher

### Issue: Install button disabled for Character
- **Solution**: 
  - Ensure parent Environment is installed first
  - Check dependency validation logic

### Issue: Files not in correct location
- **Solution**: 
  - Verify game path is correct
  - Check `getDLCInstallPath()` function
  - Ensure Plugins folder exists

### Issue: Download fails
- **Solution**: 
  - Verify manifest URL is accessible
  - Check network connectivity
  - Verify manifest format is chunk-based
  - Check R2 bucket permissions

## Test Data Examples

### Sample Environment DLC
```json
{
  "id": "dlc_hospital",
  "name": "Hospital Environment",
  "type": "environment",
  "version": "1.0.0",
  "manifestUrl": "https://pub-xxx.r2.dev/DLC_Hospital/v1.0.0/manifest.json",
  "folderName": "DLC_Hospital",
  "description": "Hospital environment DLC",
  "enabled": true
}
```

### Sample Character DLC
```json
{
  "id": "dlc_hospital_rachael",
  "name": "Rachael Character",
  "type": "character",
  "parentId": "dlc_hospital",
  "version": "1.0.0",
  "manifestUrl": "https://pub-xxx.r2.dev/DLC_Hospital_Rachael/v1.0.0/manifest.json",
  "folderName": "DLC_Hospital_Rachael",
  "description": "Rachael character for Hospital",
  "enabled": true
}
```

## Success Criteria

✅ All DLCs can be created in Admin website  
✅ Hierarchical structure displays correctly  
✅ Dependencies are enforced  
✅ DLCs download and install correctly  
✅ Files are placed in correct Plugins subfolders  
✅ Verification works  
✅ Uninstall works with dependency checks  
✅ State persists across launcher restarts  
✅ Error handling works for edge cases  

