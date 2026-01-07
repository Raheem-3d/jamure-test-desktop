// 1. Custom Hook Challenge

// Question:
// Create a custom hook called useFetch that takes a URL and returns { data, error, loading }.
// Handle cleanup (cancel fetch) when the component unmounts or the URL changes.
// Key Concepts:
// Hooks, useEffect, cleanup functions, async logic, dependency array.
// /
// useFetch
//    - url: string | null(if null, hook won't fetch)
//       - options: optional fetch options

// Returns: { data, error, loading }
//   /
// export function useFetch(url, options = {}) {
//   const [data, setData] = useState(null);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (!url) {
//       // if no url provided, reset and do nothing
//       setData(null);
//       setError(null);
//       setLoading(false);
//       return;
//     }

//     const controller = new AbortController();
//     const { signal } = controller;

//     let didStart = true;
//     setLoading(true);
//     setError(null);

//     async function fetchData() {
//       try {
//         const response = await fetch(url, { ...options, signal });

//         // handle non-2xx
//         if (!response.ok) {
//           const text = await response.text().catch(() => "");
//           throw new Error(`Request failed (${response.status}) ${text}`);
//         }

//         const json = await response.json();
//         if (!signal.aborted) {
//           setData(json);
//         }
//       } catch (err) {
//         // ignore abort errors — they are expected on cleanup
//         if (err.name === "AbortError") return;
//         if (!signal.aborted) {
//           setError(err);
//         }
//       } finally {
//         if (!signal.aborted) {
//           setLoading(false);
//         }
//       }
//     }

//     fetchData();

//     // cleanup — abort the in-flight request when url changes / component unmounts
//     return () => {
//       didStart = false;
//       controller.abort();
//     };
//   }, [url, JSON.stringify(options)]); // include options if they matter; stringify to shallow-compare

//   return { data, error, loading };
// }

// 2. Performance Optimization
// Question:
// You have a component that re-renders too often because of prop changes.
// Refactor the following component using React.memo, useCallback, or useMemo to avoid unnecessary renders.

//    / ---------------------------
//       1) TodoList + ChatComponent
// ---------------------------  /

// Pure presentational list — memoized so it only re-renders when `todos` changes.
// const TodoList = memo(function TodoList({ todos }) {
//   console.log("TodoList rendered");
//   return (
//     <ul>
//       {todos.map((todo) => (
//         <li key={todo.id}>{todo.text}</li>
//       ))}
//     </ul>
//   );
// });

// Parent creates todos once (useMemo) so TodoList doesn't get a new array every render.
// export function ChatComponent() {
//   console.log("ChatComponent render");

//   // stable todos array (memoize to avoid identity changes)
//   const todos = useMemo(
//     () => [
//       { id: 1, text: "Todo 1" },
//       { id: 2, text: "Todo 2" },
//     ],
//     [] // no dependencies -> created once
//   );

//   return <TodoList todos={todos} />;
// }

//    / ---------------------------
//       2) AllChannelPage + ChildComponent
// ---------------------------  /

// Child is memoized so it only re-renders when onClick identity changes.
// const ChildComponent = memo(function ChildComponent({ onClick }) {
//   console.log("ChildComponent rendered");
//   return <button onClick={onClick}>Increment</button>;
// });

// export function AllChannelPage() {
//   const [channelCount, setChannelCount] = useState(0);

//   // useCallback returns a stable function identity.
//   // We use functional update so we don't need channelCount in deps.
//   const handleClick = useCallback(() => {
//     setChannelCount((prev) => prev + 1);
//   }, []); // no deps, identity stable

//   return (
//     <div>
//       <p>Count: {channelCount}</p>
//       <ChildComponent onClick={handleClick} />
//     </div>
//   );
// }

// / ---------------------------
//    3) ProductLists with useMemo
// ---------------------------  /

// export function ProductLists({ data = [] }) {
//   const [filterItems, setFilterItems] = useState("");
//   const [count, setCount] = useState(0);

//   // Memoize expensive filter operation — recomputes only when `data` or `filterItems` change.
//   const filterTerms = useMemo(() => {
//     console.log("Computing filtered products");
//     if (!filterItems) return data;
//     const lower = filterItems.toLowerCase();
//     return data.filter((item) => item.name.toLowerCase().includes(lower));
//   }, [data, filterItems]);

//   return (
//     <div>
//       <input
//         type="text"
//         placeholder="Filter products"
//         value={filterItems}
//         onChange={(e) => setFilterItems(e.target.value)}
//       />
//       <button onClick={() => setCount((c) => c + 1)}>Increment Count: {count}</button>

//       <ul>
//         {filterTerms.map((item) => (
//           <li key={item.id}>{item.name}</li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// 3. Context + Reducer Implementation

// Question:
// Implement a simple ThemeContext using the Context API and useReducer for managing light/dark mode.
// Provide a toggle function to switch between modes.

// import { useReducer, useState } from "react";

// const ThemeContext = createContext();

// function themeReducer(state, action) {
//   switch (action.type) {
//     case "TOGGLE_THEME":
//       return state === "light" ? "dark" : "light";
//     default:
//       return state;
//   }
// }

// export function ThemeProvider({ childern }) {
//   const [theme, dispatch] = useReducer(themeReducer, "light");

//   const toggleTheme = () => dispatch({ type: "TOGGLE_THEME" });

//   return (
//     <ThemeContext.provider value={{ theme, toggleTheme }}>
//       {childern}
//     </ThemeContext.provider>
//   );
// }

// export function useTheme(){

//   const context = useContext (ThemeContext);
//   if(!context){
//     throw new Error ("useTheme must be used inside ThemeProvider");
//   }
//      return context;

// }

//  const ThemeButton = () =>{

//     const {theme,toggleTheme}= useTheme();
//     return(
//       <button onClick={toggleTheme}>
//          Toggle Theme (Current :{theme})
//       </button>
//     )

//  }

// function app (){

//      const {theme} = useTheme();

//       return (
//         <div
//    className={`h-screen flex flex-1 items-center justify-center transition-all duration-all ${
//     theme === "light" ? "bg-white text-black" : "bg-black text-white"
//    } `} >

//      <h1>Theme Color Change</h1>
//      <ThemeButton/>
//         </div>
//       )

// }

//----------------------------------------------------------

// import React from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import   as z from 'zod';

// // Schema: clear, strict validation rules
// const schema = z.object({
//   name: z.string().min(1, 'Name is required'),
//   email: z.string().email('Invalid email address'),
//   password: z.string().min(8, 'Password must be at least 8 characters'),
// });

// type FormData = z.infer<typeof schema>;

// export default function LoginPage() {
//   const {
//     register,
//     handleSubmit,
//     formState: { errors, isValid, isSubmitting },
//   } = useForm<FormData>({
//     resolver: zodResolver(schema),
//     mode: 'onChange', // validate as the user types
//     defaultValues: { name: '', email: '', password: '' },
//   });

//   const onSubmit = async (data: FormData) => {
//     try {
//       // Replace with your real API call
//       await new Promise((r) => setTimeout(r, 600));
//       console.log('Submitted', data);
//       // show success UI / redirect
//     } catch (err) {
//       // Surface user-friendly error (don't throw)
//       console.error(err);
//       alert('Submission failed — try again');
//     }
//   };

//   return (
//     <div className="max-w-md mx-auto flex items-center justify-center h-screen p-4">
//       <form
//         onSubmit={handleSubmit(onSubmit)}
//         className="w-full bg-white shadow rounded-lg p-6"
//         noValidate
//         aria-describedby="form-errors"
//       >
//         <h2 className="text-2xl font-semibold mb-4">Sign in</h2>

//         <div className="mb-4">
//           <label htmlFor="name" className="block text-sm font-medium text-gray-700">
//             Name
//           </label>
//           <input
//             id="name"
//             type="text"
//             {...register('name')}
//             aria-invalid={!!errors.name}
//             aria-describedby={errors.name ? 'name-error' : undefined}
//             className="mt-1 block w-full border rounded p-2"
//           />
//           {errors.name && (
//             <p id="name-error" className="text-sm text-red-600 mt-1">
//               {errors.name.message}
//             </p>
//           )}
//         </div>

//         <div className="mb-4">
//           <label htmlFor="email" className="block text-sm font-medium text-gray-700">
//             Email
//           </label>
//           <input
//             id="email"
//             type="email"
//             {...register('email')}
//             aria-invalid={!!errors.email}
//             aria-describedby={errors.email ? 'email-error' : undefined}
//             className="mt-1 block w-full border rounded p-2"
//           />
//           {errors.email && (
//             <p id="email-error" className="text-sm text-red-600 mt-1">
//               {errors.email.message}
//             </p>
//           )}
//         </div>

//         <div className="mb-4">
//           <label htmlFor="password" className="block text-sm font-medium text-gray-700">
//             Password
//           </label>
//           <input
//             id="password"
//             type="password"
//             {...register('password')}
//             aria-invalid={!!errors.password}
//             aria-describedby={errors.password ? 'password-error' : undefined}
//             className="mt-1 block w-full border rounded p-2"
//           />
//           {errors.password && (
//             <p id="password-error" className="text-sm text-red-600 mt-1">
//               {errors.password.message}
//             </p>
//           )}
//         </div>

//         <div id="form-errors" aria-live="polite" className="min-h-[1.5rem]">
//           {/  Generic place to surface global errors if needed  /}
//         </div>

//         <button
//           type="submit"
//           disabled={!isValid || isSubmitting}
//           className={`mt-4 w-full py-2 rounded text-white ${
//             !isValid || isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
//           }`}
//         >
//           {isSubmitting ? 'Submitting...' : 'Submit'}
//         </button>
//       </form>
//     </div>
//   );
// }

// pages/posts/[id].js
// Dynamic route that demonstrates Static Site Generation with fallback handling.
// Uses jsonplaceholder.typicode.com as a mock API for demo purposes.

// import React from 'react';
// import Link from 'next/link';

// export default function Post({ post }) {
//   if (!post) return <div style={{padding:20}}>Loading…</div>; // only seen briefly for fallback: true

//   return (
//     <main style={{fontFamily: 'system-ui, sans-serif', padding: 20}}>
//       <Link href="/posts"><a>← Back to posts</a></Link>
//       <h1 style={{marginTop: 12}}>{post.title}</h1>
//       <p style={{color: '#666'}}><em>Post ID: {post.id}</em></p>
//       <article style={{marginTop: 16}}>{post.body}</article>
//     </main>
//   );
// }

// // getStaticPaths: tell Next.js which pages to pre-render at build time
// export async function getStaticPaths() {
//   // For demo: pre-render first 5 posts during build.
//   const paths = [1,2,3,4,5].map(id => ({ params: { id: String(id) } }));

//   return {
//     paths,
//     // fallback options:
//     // false  -> any path not returned here will 404
//     // true   -> non-generated paths will be rendered on the client after a fallback render
//     // 'blocking' -> non-generated paths will be server-rendered on first request, then cached as static
//     fallback: 'blocking',
//   };
// }

// // getStaticProps: fetch data for each page at build time (or on-demand when used with fallback:'blocking')
// export async function getStaticProps({ params }) {
//   const id = params.id;
//   try {
//     const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);

//     if (res.status === 404) {
//       return { notFound: true };
//     }

//     if (!res.ok) {
//       throw new Error(`API returned ${res.status}`);
//     }

//     const post = await res.json();

//     return {
//       props: { post },
//       // Optional: ISR — regenerate this page in the background at most once every 60s
//       revalidate: 60,
//     };
//   } catch (err) {
//     // On error, you could either return notFound or return an error prop and render a friendly message.
//     // Here we return notFound so Next.js will show the 404 page for missing/unavailable posts.
//     return { notFound: true };
//   }
// }

// Implement lazy loading for a heavy component (e.g. Chart.js) using React.lazy() and Suspense.
// Show a loading spinner while the component loads.

// import React from 'react';

// const Chart = () => {
//   return (
//     <h1>Heavy Component.</h1>
//   )

// }
//  export default Chart;

// const Chat = React.lazy(() => import('./Chart'))
// import { Loader2Icon } from 'lucide-react';
// const App = () => {
//   return (
//     <div>
//       <React.Suspense fallback={<Loader2Icon className='h-5 w-5' />}>

//         <Chat />
//       </React.Suspense>

//     </div>
//   )
// }

// 7. Form Handling + Validation

// Question:
// Create a React form with name, email, and password fields.
// Add client-side validation using custom logic or a library like Yup / React Hook Form.
// Prevent submission until all fields are valid.

// import React, { useState } from "react";
// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import   as z from "zod";
// import { error } from "console";

// // Schema : clear , strict validation rules
// const schema = z.object({
//   name: z.string().min(1, "Name is required."),
//   email: z.string().email("Invalid email address."),
//   password: z.string().min(8, "Password must be 8  characters"),
// });

// type FormData = z.infer<typeof schema>;

// const LoginPage = () => {
//   const {
//     register,
//     handleSubmit,
//     formState: { errors, isValid, isSubmitting },
//   } = useForm<FormData>({
//     resolver: zodResolver(schema),
//     mode: "onChange",
//     defaultValues: { name: "", email: "", password: "" },
//   });

//   const onSubmit = async (data: FormData) => {
//     try {
//       await new Promise((r) => setTimeout(r, 600));
//       console.log("Submitted", data);
//     } catch (error) {
//       console.log(error);
//       alert("Submission failed -try again");
//     }
//   };

//   return (
//     <div className="max-w-md mx-auto flex items-center justify-center h-screen p-4">
//       <form
//         onSubmit={handleSubmit(onSubmit)}
//         noValidate
//         aria-describedby="form-errors"
//       >
//         <div className="grid grid-flow-row  gap-5">
//           <h2 className="text-2xl font-semibold mb-4">Sign in</h2>
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 ">
//               Name
//             </label>
//             <input
//               type="text"
//               {...register("name")}
//               className="w-full rounded p-2 "
//               aria-invalid={!!errors.name}
//             />
//             {errors.name && (
//               <p id="name-error" className="text-sm text-red-500 mt-1">
//                 {errors.name.message}
//               </p>
//             )}
//           </div>

//           <div>
//             <label htmlFor="" className="text-xl text-gray-700 ">
//               Email
//             </label>
//             <input
//               id="email"
//               {...register("email")}
//               aria-invalid={!!errors.email}
//               type="text"
//               className="w-full rounded p-2"
//             />
//             {errors.email && (
//               <p id="email-error" className="text-sm text-red-600 mt-1">
//                 {errors.email.message}
//               </p>
//             )}
//           </div>

//           <div>
//             <label htmlFor="" className="text-xl text-gray-700 ">
//               Password
//             </label>
//             <input
//               id="password"
//               {...register("password")}
//               aria-invalid={!!errors.password}
//               type="password"
//               className="p-4 m-2"
//             />
//             {errors.password && (
//               <p id="password-error" className="text-sm text-red-600 mt-1">
//                 {errors.password.message}
//               </p>
//             )}
//           </div>
//         </div>

//         <button
//           type="submit"
//           disabled={!isValid || isSubmitting}
//           className={`mt-4 w-full py-2 rounded text-white ${
//             !isValid || isSubmitting
//               ? "bg-gray-400 cursor-not-allowed"
//               : "bg-blue-600 hover:bg-blue-700"
//           }`}
//         >
//           {isSubmitting ? "Submitting.." : "submit"}
//         </button>
//       </form>
//     </div>
//   );
// };

// 8. Infinite Scroll / Pagination

// Question:
// Implement a component that fetches paginated data from an API as the user scrolls down (infinite scroll).
// Use IntersectionObserver API or a "Load More" button.
//

//---------------------------------------------------------
// 9. Optimized List Rendering (Virtualization)

// Question:
// Render a list of 10,000 items efficiently.
// Implement virtualization using react-window or your own basic virtualization logic.

// import { Item } from '@radix-ui/react-select'
// import React, { useState } from 'react'
// import {List} from 'react-window'

// const App = ()=>{

//   const [data,setData]=useState({
//       length:1000
//   })

//   return(

//     <div>
//         <List
//         rowCount ={data.length}
//         rowProps={data}
//         />

//     </div>

//   )

// }

// export default App;

// App.jsx
// import React, { useMemo, memo, useState } from "react";
// import { FixedSizeList as List } from "react-window";

// /
//    Example: render 10,000 items efficiently using react-window
//
//    Notes:
//    - itemCount: total number of rows
//    - itemSize: fixed row height in px
//     - itemData: arbitrary data passed to each row renderer
//    - Row must apply the `style` prop to the outer element (absolute positioning)
//   /

// const Row = memo(function Row({ index, style, data }) {
//   // keep row small and deterministic
//   const item = data[index];
//   return (
//     <div
//       style={{
//         ...style,
//         display: "flex",
//         alignItems: "center",
//         padding: "0 12px",
//         boxSizing: "border-box",
//         borderBottom: "1px solid #eee",
//         background: index % 2 ? "white" : "#fafafa",
//       }}
//     >
//       <div style={{ width: 48, textAlign: "right", marginRight: 12 }}>
//         {index + 1}.
//       </div>
//       <div
//         style={{
//           flex: 1,
//           overflow: "hidden",
//           textOverflow: "ellipsis",
//           whiteSpace: "nowrap",
//         }}
//       >
//         {item}
//       </div>
//     </div>
//   );
// });

// export default function App() {
//   // generate 10k items once
//   const items = useMemo(() => {
//     const arr = new Array(10000);
//     for (let i = 0; i < 10000; i++)
//       arr[i] = `Item ${i + 1} — some descriptive text to make rows realistic`;
//     return arr;
//   }, []);

//   const height = 600; // height of scrolling viewport (px)
//   const itemSize = 40; // single row height (px)
//   const width = "100%"; // can be px or %; react-window accepts numbers for fixed pixel width

//   return (
//     <div style={{ width: 800, margin: "40px auto" }}>
//       <h3>Virtualized list (react-window) — 10,000 items</h3>
//       <List
//         height={height}
//         itemCount={items.length}
//         itemSize={itemSize}
//         width={width}
//         itemData={items}
//       >
//         {Row}
//       </List>

//       <List/
//       height={height};

//       >
//     </div>
//   );
// }

// ///import React  from 'react';

// const App = ({ url }) => {
//   const [data, setData] = useState([]);
//   const [error, setError] = useState(null);
//   const [message, setMessage] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const controller = new AbortController();
//   const { signal } = controller;

//   React.useEffect(() => {
//     if (!url) {
//       setData(null);
//       setError(null);
//       setLoading(true);
//     }

//       const fetchData = async () => {
//     try {
//       const response = await fetch(`http://localhost:3000/api/register`);
//            if(!signal.aborted){
//     const  fetchData = await response.json();
//     setData(fetchData);

//      }

//     } catch (error) {
//       if (signal.aborted) {
//         setError(error);
//         console.log(error, " Error setError and Find this Log");
//       }
//     } finally {
//       setLoading(false);
//     }

//      const data = message.map(()=>(
//          return(message)
//      ))

//     return () => {
//       controller.abort();
//       setLoading(false);
//     };
//   };
//   }, [url]);

//   return(
//     <div>
//           {
//             data.map((items, i)=>(
//               <ul>
//                <li>{items.data}</li>
//                <li>{items.email}</li>
//                <li>{items.password}</li>
//                <li className="flex flex-data from-lime-300">{items.#fafafa}</li>
//                <li></li>
//                <li></li>

//               </ul>
//             ))
//           }

//     </div>

//   )

// };

// export default App;

// Connection upgrade hota hai: HTTP → WebSocket via Upgrade header.

// 9 . Establish Websocket connection client side and server side
//

//   server side
// npm install ws

// const WebSocket = require("ws");
// const server = new WebSocket.Server({ port: 8080 });

// // track active client if you need to broadcast later

// const client = new Set();

// server.on("connection", (socket) => {
//   client.add(socket);
//   console.log("client Connected");

//   socket.on("message", (msg) => {
//     console.log("Message Received :", msg);
//     socket.send("server replay :" + msg);
//     for (const c of client) {
//       if (c.readyState === WebSocket.OPEN) {
//         c.send("broadcast" + msg);
//       }
//     }

//     socket.on("close", () => {
//       client.delete(socket);
//       console.log("client disconnected");
//     });

//     socket.on("error", (error) => {
//       console.log(error);
//     });
//   });
// });

// console.log("Websocket");

// import React, { useState, useEffect } from "react";

// export default function RealTimeMessage() {
//   const [socket, setSocket] = useState(null);
//   const [message, setMessage] = useState([]);

//   useEffect(() => {
//     const ws = new WebSocket("ws://localhost:8008");
//     ws.onopen = () => {
//       ws.send("hello");
//     };

//     ws.onmessage = (event) => {
//       setMessage((prev) => [...prev, event.data]);
//     };

//     ws.onclose = () => {
//       console.log("close");
//     };

//     ws.onerror = (error) => {
//       console.log("error", error);
//     };

//     setSocket(ws);

//     return () => {
//       ws.onclose();
//     };
//   }, []);

//   const sendMessage = () => {
//     if (!socket || socket.readyState !== WebSocket.OPEN) return;

//     socket.send("client Message");
//   };

//   return <div>{message.map((msg) => ({ msg }))
//   }</div>;
// }

// const WebSocket = require("ws");

// const server = WebSocket.server({ port: 8080 });

// const client = new Set();

// const group = new Set();

// function joinGroups(groupName, socket) {
//   if (!group.has(groupName)) {
//     group.set(groupName, new Set());
//   }
//   group.get(groupName).add(socket);
// }
// function broadcastMessage(groupName, message, sender) {
//   if (!group.has(groupName)) {
//     return;
//   }

//   for (const client of group.get(groupName)) {
//     if (!client == sender && client.readyState == WebSocket.OPEN) {
//       client.send(message);
//     }
//   }
// }

// function leaveGroup(groupName, socket) {
//   if (!group.has(groupName)) return;
//   group.get(groupName).delete(socket);
//   if (group.get(groupName).size == 0) {
//     group.delete(groupName);
//   }
// }

// server.on("connection", (socket) => {
//   client.add(socket);
//   group.add(socket);
//   console.log("Connection successful.");

//   socket.on("message", (socket) => {
//     let data;
//     try {
//       data = JSON.parse(socket);
//     } catch (error) {
//       return;
//     }

//     const { type, message, group } = data;

//     if (type == "join") {
//       joinGroups(group, socket);
//       return;
//     }

//     if (type == "leave") {
//       leaveGroup(group, socket);
//       return;
//     }

//     if (type == "meg") {
//       broadcastMessage(group, message, socket);
//       return;
//     }
//   });

//   socket.on("close", (socket) => {
//     client.delete(socket);
//     group.delete(socket);
//     console.log("disconnect");

//     for (const [groupName, members] of group) {
//       members.delete(socket);
//       if (members.size == 0) {
//         group.delete(groupName);
//       }
//     }
//   });

//   socket.on("error", (error) => {
//     console.log("error");
//   });
// });

// 1. Controlled vs Uncontrolled Components

// Build a reusable <Input /> component that supports both controlled and uncontrolled modes.
// The component must not re-render unnecessarily when used in controlled mode.

// import React, { forwardRef, useRef, useEffect, useCallback } from "react";

// // InnerInput component ko define kar rahe hain
// function InnerInput(props, forwardedRef) {
//   const { value, defaultValue, onChangeValue, ...rest } = props; // props destructure kar rahe hain
//   const isControlled = value !== undefined; // check karte hain ki controlled mode hai ya nahi

//   const onChangeRef = useRef(onChangeValue); // onChangeValue ko ref me store karte hain
//   useEffect(() => {
//     onChangeRef.current = onChangeValue; // jab bhi onChangeValue change ho, ref update karo
//   }, [onChangeValue]);

//   const handleChange = useCallback((e) => { // stable change handler create karte hain
//     const v = e.target.value; // event se value nikalte hain
//     if (onChangeRef.current) onChangeRef.current(v, e); // current callback ko call karte hain
//   }, []); // callback kabhi re-create nahi hota

//   return (
//     <input
//       {...rest} // baaki props spread karte hain
//       ref={forwardedRef} // input ka ref forward karte hain
//       value={isControlled ? value : undefined} // controlled mode me value set hoti hai
//       defaultValue={isControlled ? undefined : defaultValue} // uncontrolled mode me defaultValue set hoti hai
//       onChange={handleChange} // stable change handler input ko dete hain
//     />
//   );
// }

// // Input component ko memoize karte hain performance optimize karne ke liye
// const Input = React.memo(
//   forwardRef(InnerInput), // component ko ref forwarding ke saath wrap karte hain
//   (prev, next) => { // custom comparator function
//     const prevControlled = prev.value !== undefined; // pehle controlled tha ya nahi
//     const nextControlled = next.value !== undefined; // ab controlled hai ya nahi

//     if (prevControlled !== nextControlled) return false; // mode change hua toh re-render karo

//     if (nextControlled) {
//       return (
//         prev.value === next.value && // controlled me value compare karte hain
//         prev.disabled === next.disabled && // disabled prop compare
//         prev.placeholder === next.placeholder && // placeholder compare
//         prev.readOnly === next.readOnly && // readOnly compare
//         prev.type === next.type // type compare
//       );
//     }

//     return (
//       prev.defaultValue === next.defaultValue && // uncontrolled me defaultValue compare karte hain
//       prev.disabled === next.disabled && // disabled compare
//       prev.placeholder === next.placeholder && // placeholder compare
//       prev.readOnly === next.readOnly && // readOnly compare
//       prev.type === next.type // type compare
//     );
//   }
// );

// export default Input; // Input component ko export karte hain

// 2. Implement Debounced Search

// Create a search bar that debounces user input (300ms).
// Do not use lodash; implement debounce logic yourself using useRef.

// import React, { useEffect, useRef, useState } from "react";

// const SearchDebounce = () => {

//    const [search, setSearch] = useState('')
//    const [inputValue, setInputValue] = useState('')
//    const refSearch = useRef(null);

//    const handelChange = (e) => {
//       const value = e.target.value;

//       if (refSearch.current) {
//          clearTimeout(refSearch.current)
//       }

//       refSearch.current = setTimeout = (() => {
//          setSearch(value)
//       }, 300)

//    }

//    const handelSubmit = (e) => {
//       e.preventDefault()
//       //.  show result
//       console.log(search, 'search')

//    }

//    // clean of function
//    useEffect(() => {
//       return () => {
//          if (refSearch.current !== null) {
//             clearTimeout(refSearch.current)
//          }
//       }
//    }, [])

//    return (
//       <div>
//          <form onSubmit={handelSubmit} >

//             <input type="text"
//                value={inputValue}
//                placeholder="type to search"
//                onChange={handelChange} />
//             <button type="submit"  >Search</button>

//          </form>

//          <div>
//     Debounced (300): {search}

//          </div>

//       </div>

//    )
// };

// export default SearchDebounce;

// 3. Race Conditions in useEffect

// Fix the race condition in a component that fetches data on input change.
// Ensure only the latest request updates state.

// import React, { useState, useEffect, useRef, useCallback } from 'react';

// // Fixed Chat component
// // Key fixes:
// // - Proper debounced input handling (separate input value from searched query)
// // - useEffect-driven fetch when url or searched query changes
// // - Abort previous requests using AbortController to avoid race conditions
// // - Avoid setting state on unmounted component
// // - Clean, consistent naming (handle*), error handling and rendering

// export default function Chat({ url }) {
//   const [input, setInput] = useState('');
//   const [query, setQuery] = useState(''); // the debounced query that triggers fetch
//   const [data, setData] = useState([]);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const debounceRef = useRef(null);
//   const activeControllerRef = useRef(null);
//   const mountedRef = useRef(true);

//   useEffect(() => {
//     return () => {
//       // component unmount
//       mountedRef.current = false;
//       // abort any in-flight request
//       if (activeControllerRef.current) activeControllerRef.current.abort();
//       // clear debounce timer
//       if (debounceRef.current) clearTimeout(debounceRef.current);
//     };
//   }, []);

//   // debounced handler for input -> query
//   const handleChange = useCallback((e) => {
//     const value = e.target.value;
//     setInput(value);

//     // clear existing timer
//     if (debounceRef.current) clearTimeout(debounceRef.current);

//     debounceRef.current = setTimeout(() => {
//       // update query which will trigger fetch in the effect below
//       setQuery(value);
//     }, 300); // kept short; change to 3000 if you really want 3s debounce
//   }, []);

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // form submission is no-op; we already fetch on change (debounced)
//   };

//   if (loading) return <div>Loading...</div>;

//   return (
//     <div>
//       <form onSubmit={handleSubmit}>
//         <div className="max-w0-7xl flex justify-center content-center items-center">
//           <input
//             className="p-2 h-16 w-64 m-3"
//             type="text"
//             placeholder="Type to search"
//             value={input}
//             onChange={handleChange}
//           />
//         </div>

//         <div className="max-w0-7xl flex justify-center content-center items-center">
//           {error && <div role="alert">Error: {String(error.message || error)}</div>}

//           {!error && data && data.length === 0 && <div>No results</div>}

//           {!error && data && (
//             <ul>
//               {data.map((item, i) => (
//                 <li key={i}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
//               ))}
//             </ul>
//           )}
//         </div>
//       </form>
//     </div>
//   );
// }

// React Error Boundaries
// Implement an error boundary component that catches render errors
//  from its children and shows a fallback UI.

// import React from 'react';

// export class ErrorBoundary extends React.Component{
//   constructor(props){
//         super(props);
//         this.state = {hasError:false}
//   }

//  static getDerivedStateFromError(){
//    return {hasError:true};
//   }

//   componentDidCatch(error,errorInfo){
//       logErrorToMyService(error,errorInfo);
//   }

//    render(){
//             if(this.state.hasError){
//                return <h1>Something Went Wrong.</h1>
//             }

//             return  this.props.children;
//    }
// }

// import react, { useState, useTransition } from "react";

// export default function ChatListSearch({ items }) {

//    const [query, setQuery] = useState('');
//    const [filterItem, setFilterItem] = useState([]);
//    const { isPending, startTransition } = useTransition();


//    const handelChange = (e) => {
//       const value = e.target.value;
//       setQuery(value)
//       startTransition(() => {
//          const filter = items.filter((item) => item.toLowerCase().includes(value.toLowerCase()))
//          setFilterItem(filter)
//       })

//    }

//    return (

//       <div className=" max-w-7xl ">
//          <div className=" flex justify-center items-center">
//             <input
//                type="text"
//                placeholder="Type to search"
//                value={query}
//                onChange={handelChange}
//             />

//             {isPending && <p>Loading...</p>}

//             <div>
//                <ul>
//                   {
//                      filterItem.map((item, index) => (
//                         <li key={index}>{item}</li>
//                      ))
//                   }
//                </ul>
//             </div>

//          </div>

//       </div>
//    )
// }