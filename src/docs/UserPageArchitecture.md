# Personal page editing system - Architecture Description

## 📋 Data flow architecture

### 1. **User page data acquisition**
- **Show user page**: Directly from `/api/v2/me/` Responsive `page` Field acquisition
- **Edit user page**: use `/api/v2/users/{id}/page` Update the interface

### 2. **API Interface description**

#### 📖 Page content acquisition
```typescript
// Get page data from user object
const userPage = user.page; // { html: string, raw: string }
```

#### ✏️ Page content edit
```typescript
// Update page content
await userAPI.updateUserPage(userId, content);
// return: { html: string }
```

#### ✅ BBCode verify
```typescript
// real timeverifyBBCodegrammar
await userAPI.validateBBCode(content);
// return: { valid: boolean, errors: string[], preview: { html: string, raw: string } }
```

### 3. **Component data flow**

```
UserPage.tsx (Manage user status)
    ↓
UserProfileLayout.tsx (Integrated page display and editing)
    ↓
UserPageDisplay.tsx (show) ←→ UserPageEditor.tsx (edit)
    ↓                              ↓
user.page Fields                  BBCodeEditor.tsx
```

### 4. **Status Management**

1. **UserPage**: Maintain complete user object status
2. **UserProfileLayout**: manageeditMode Switching
3. **UserPageDisplay**: Directly from `user.page` Read content
4. **UserPageEditor**: 
   - Initialization from `user.page.raw` Get content
   - Called when saving API renew
   - After saving successfully, callbackrenewUser status of parent component

### 5. **Key implementation details**

#### ✨ Optimization point
- **reduceAPICall**: showNo additionalAPIask
- **Real-time synchronization**: editImmediately after savingrenewLocal status
- **consistency**: make sureshowandedituseSame data source

#### 🔄 Data synchronization process
1. User access page → Get user data (including `page` Fields)
2. showpagecontent → directuse `user.page.html`
3. Clickedit → from `user.page.raw` initializationeditDevice
4. Save changes → CalleditAPI → renewLocal user status
5. returnshowmodel → showrenewThe lattercontent

### 6. **API Standard correspondence**

According to the providedAPIdocument:

- ✅ `GET /api/v2/users/{user_id}/page` - For onlyeditGet the latestcontent
- ✅ `PUT /api/v2/users/{user_id}/page` - renewuserpagecontent
- ✅ `POST /api/v2/me/validate-bbcode` - BBCodegrammarverify

The main source of user page content is `/api/v2/me/` Responsive `page` Fields:

```json
{
  "page": {
    "html": "<processed-html-content>",
    "raw": "[bbcode]originalBBCodecontent[/bbcode]"
  }
}
```

### 7. **Testing and debugging**

use `UserPageTestPage.tsx` Can:
- Test three typesmodel:show,edit,BBCodeeditDevice
- View user page data structure
- verifysaveThe latterdatasynchronous
- debugBBCodeverifyandPreview function

## 🎯 Summarize

This architecture ensures:
1. **Performance optimization**: reduceUnnecessaryAPICall
2. **dataconsistency**: Unifieddatasourceandrenewmechanism
3. **User Experience**: Real-time preview and instant feedback
4. **Maintainability**: Clear separation of components