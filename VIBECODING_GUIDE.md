Here is the guide in Markdown format, written in English and designed for non-developers. You can save this text as a file named `VIBECODING_GUIDE.md` or `CONTRIBUTING.md` and include it inside the ZIP file you created.

***

# 🌌 Zodiac Cipher: Vibe Coding Guide

Congratulations! You've found the source code.

This guide is designed for **non-developers**. You don't need to know how to write code to improve this app. You just need to know how to talk to an AI. This process is called **"Vibe Coding"**.

Follow these three steps to bring your own ideas to life.

---

## 1. Get the Code on GitHub

To make changes and run the app, you need to host the files on GitHub.

1.  **Unzip the file:** Extract the `.zip` file you just downloaded. You should see a folder containing files like `package.json`, `src`, `public`, etc.
2.  **Create an Account:** Go to [github.com](https://github.com/) and sign up for a free account.
3.  **Create a Repository:**
    *   Click the **+** icon in the top-right corner and select **New repository**.
    *   Name it `zodiac-puzzle` (or whatever you like).
    *   Make sure **Public** is selected.
    *   Click **Create repository**.
4.  **Upload Files:**
    *   On the next screen, look for the link that says **uploading an existing file**.
    *   Drag and drop **all the files and folders** from your unzipped folder into the browser window.
    *   Wait for them to upload, then click the green **Commit changes** button at the bottom.

---

## 2. Launch your Workspace (Codespaces)

You don't need to install anything on your computer. We will use a cloud computer called a "Codespace".

1.  Go to your new GitHub repository page.
2.  Click the green **Code** button.
3.  Switch to the **Codespaces** tab.
4.  Click **Create codespace on main**.
5.  A new browser tab will open with a code editor (VS Code). It might take a minute to set up.
6.  **Start the App:**
    *   Look for the **Terminal** (a text box at the bottom of the screen).
    *   Type `npm install` and press **Enter**. (This downloads the necessary tools).
    *   Once that finishes, type `npm run dev` and press **Enter**.
7.  **View the App:** You will see a popup saying "Application running on port 5173". Click **Open in Browser**.

---

## 3. Instruct the AI (Google AI Studio)

Now comes the magic. We will use Google's AI (Gemini) because it has a huge "context window" (it can read many files at once).

1.  **Set up AI Studio:**
    *   Go to [aistudio.google.com](https://aistudio.google.com/) and log in with your Google account.
    *   Click **Create new** -> **Chat prompt**.
    *   On the right side, select the Model: **Gemini 1.5 Pro** (this model is best for coding).

2.  **Feed the AI the Context:**
    *   You need to give the AI the current code so it knows what to modify.
    *   From your unzipped folder on your computer, drag and drop the following key files into the "System Instructions" or the chat box in AI Studio:
        *   `src/App.tsx` (The main brain)
        *   `src/style.css` (The look and feel)
        *   `src/types.ts` (The data structures)
        *   `src/components/Board.tsx`
        *   `src/components/LeftSidebar.tsx`
        *   `src/components/RightSidebar.tsx`
    *   *Tip: You can upload more files later if you need to change specific parts.*

3.  **Start Vibe Coding:**
    *   In the text box, type a prompt like this:
        > "I have uploaded the source code for a React application. I want you to act as an expert React developer. I will ask for changes, and you will provide the full updated code for the specific file I need to change."
    *   **Make a wish:** Now, ask for what you want. For example:
        > "I want to change the background color of the board to dark blue."
        > *or*
        > "Add a button in the Left Sidebar that clears all text."

4.  **Apply Changes:**
    *   The AI will give you a block of code.
    *   Go back to your **Codespaces** tab.
    *   Find the correct file in the file explorer on the left (e.g., `src/style.css`).
    *   Delete the old code and paste in the new code from the AI.
    *   The "Open in Browser" tab will update automatically!

---

**Happy Coding! 🕵️‍♂️**