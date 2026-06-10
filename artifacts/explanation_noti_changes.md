# Explanation of Notification Filtering Changes

This document explains the technical details of the bugs identified, why they occurred, and how they were resolved in both the backend and frontend of SupportIQ.

---

## 1. Backend: The Express Routing Collision

### The Problem
When you sent a `POST` request to `http://localhost:5000/agent/noti/filter` from Postman, it failed with:
```json
{
    "error": "Error marking the notification as read"
}
```

### Why it Occurred
In Express, route handlers are matched sequentially from top to bottom. If a route matches the requested path structure, Express executes it immediately.

Before the fix, the routes in [agent.js](file:///d:/CCE/WebDev_Course/supportiq/server/routes/agent.js) were defined in this order:

```javascript
// 1. Parameterized route
router.post("/noti/:id", verifyToken, async (req, res) => {
    await mark_noti_read(req, res);
});

// 2. Static route
router.post("/noti/filter", verifyToken, async (req, res) => {
    await filterNoti(req, res);
});
```

When you requested `POST /noti/filter`, Express saw the first route pattern `"/noti/:id"`. Since `":id"` is a wildcard parameter, Express matched the word `"filter"` as the parameter `id` (`req.params.id = "filter"`) and executed `mark_noti_read`. 

Inside `mark_noti_read`, the database query failed because it tried to find a notification with the non-numeric string ID `"filter"`:
```sql
SELECT * FROM Notifications WHERE notification_id = 'filter' AND user_id = $2;
```
This threw a database error, triggering the catch block which responded with `"Error marking the notification as read"`.

### The Fix
Static routes must always be declared **before** parameterized routes. The routes were swapped:

```javascript
// 1. Static route (Matched first)
router.post("/noti/filter", verifyToken, async (req, res) => {
    await filterNoti(req, res);
});

// 2. Parameterized route (Catch-all for anything else)
router.post("/noti/:id", verifyToken, async (req, res) => {
    await mark_noti_read(req, res);
});
```
Now, `POST /noti/filter` matches route #1, and `POST /noti/123` falls through to route #2.

---

## 2. Frontend: Filtering Logic and State Handling

### The Problem
In [AgentNoti.jsx](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/pages/agent/AgentNoti.jsx), clicking the "Unread" or "Read" buttons would fire the API request but the UI would not update. 

### Why it Occurred
The original `handleClick` function made the API request but didn't save the returned notifications into the component's state:

```javascript
// OLD IMPLEMENTATION
async function handleClick(e){
    e.preventDefault();
    const {name} = e.target;
    setView(name);
    if(name === "unread"){
        await axios.post("/agent/noti/filter", {"state": "unread"}); // Response data was ignored
    }
    else{
        await axios.post("/agent/noti/filter", {"state": "read"}); // Response data was ignored
    }
}
```

### The Fixes
1. **Update React State:**
   We modified the handler to retrieve `res.data` from the axios response and apply it to state using `setNoti`:
   ```javascript
   async function handleClick(e){
       e.preventDefault();
       const {name} = e.target;
       setView(name);
       try {
           const res = await axios.post("/agent/noti/filter", { "state": name });
           setNoti(res.data); // Updates the list on the screen
       } catch (error) {
           console.error("Error filtering notifications", error);
       }
   }
   ```

2. **Consistent Initial State:**
   Since the `view` state defaults to `"unread"`, we updated the initial `useEffect` to fetch unread notifications using the filter endpoint rather than fetching all of them:
   ```javascript
   useEffect(() => {
       const fetchNotifications = async () => {
           try {
               const res = await axios.post("/agent/noti/filter", { state: "unread" });
               setNoti(res.data);
           } catch (error) {
               console.error("Error fetching notifications", error);
           }
       };
       fetchNotifications();
   }, []);
   ```

3. **Conditional "Mark as Read" Rendering:**
   Once a notification is read, showing a "Mark as Read" button is redundant. We conditionally hide the action panel when the view is set to `"read"`:
   ```javascript
   {view === "unread" && (
       <div className="mark">
           <button onClick={() => handleRead(item.notification_id)}>Mark as Read</button>
       </div>
   )}
   ```

---

## 3. UI Styling (UX/Aesthetics)

In [AgentNoti.css](file:///d:/CCE/WebDev_Course/supportiq/frontend/src/styles/AgentNoti.css), we added custom styles to support active tab states and sleek controls:
* **Active Tab Highlights:** Filter buttons get a purple highlight (`#5e6ad2`) and dynamic box shadow glows when active (`view === "unread"` or `view === "read"`).
* **Hover Transitions:** Added subtle color and border transitions on button hovers.
* **Mark as Read Styling:** Styled the action button with a transparent base, light purple borders, and solid purple color fill on hover.
