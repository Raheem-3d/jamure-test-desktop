import { ReceiptRussianRubleIcon } from "lucide-react";
import React, { useState } from "react";
//  In next Js they Are two type of API call Method.
// 1- server Side generation .  fetch html for Every Request.

export function ChatServerSideGeneration({ users, error }) {
  return (
    <div className="max-w-7xl mx-auto items-center text-center ">
      <h1> Chats Come From Server and Build for every request.</h1>
      {error && <div className="text-center text-lg"> Error :{error}</div>}

      {users.map((user, i) => (
        <ul key={i}>
          <li>{user.name}</li>
          <li>{user.email}</li>
        </ul>
      ))}
    </div>
  );
}

export async function setServerSideProps() {
  try {
    const response = await fetch("https://dummyUserData");
    if (!response.ok) {
      throw new Error("Server Error");
    }

    const users = response.json();

    return {
      props: { users },
    };
  } catch (error) {
    return { props: { users: [], error: error.message } };
  }
}

// 2- ssg   (static site generations);

export function userStaticSideGeneration({ users, error }) {
  return (
    <div className="max-w-7xl mx-auto items-center text-center ">
      <h1> Chats Come From Server and Build for every request.</h1>
      {error && <div className="text-center text-lg"> Error :{error}</div>}

      {users.map((user, i) => (
        <ul key={i}>
          <li>{user.name}</li>
          <li>{user.email}</li>
        </ul>
      ))}
    </div>
  );
}

export async function getStaticSiteGeneration() {
  try {
    const response = await fetch("https://fakejsonData");
    if (!response.ok) {
      throw new Error("Static Server error.");
    }

    const users = response.json();

    return {
      props: { users },
    };
  } catch (error) {
    return { props: { users: [], error: error.message } };
  }
}




// Question:
// Create a dynamic route in Next.js at /posts/[id].js that displays details of a post fetched from a mock API.
// Implement both static generation and fallback handling.