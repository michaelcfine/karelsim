karelsim.com
============

KarelSim is an online simulator for "Karel the Robot," a simple "world"
for learning computer programming.

You can find KarelSim running online at [karelsim.com](http://www.karelsim.com)

# Brief summary of features

- Allows for both **manual operation** (where a user can manually turn and move Karel
  in order to "get a feel" for Karel and his world) and full
  **programmatic operation** (where Karel follows a 'program' that guides its behavior)
- Choice between **JavaScript** or **original Karel syntax** as programming language
  (FUTURE: Support for Python, PHP, Java, Ruby)
- **Syntax checker** with **error highlighting**
- **Current line pointer** while watching program execution
- **Control playback speed** of execution of program while "watching" programs execute
- **Pause and restart** execution of program
- **Step **through code one line at a time, including into functions
- **Logging** capability to aid in debugging
  (FUTURE: **full debugger with breakpoints, step into, step out, etc.**)
- Built-in commands such as move(), turnLeft(), isFrontClear(), etc.
- A set of **test worlds** that can be easily loaded/used
- The ability to **create your own worlds graphically**
- Worlds up to 12x12

# Setup

- Clone this repo
- cd <repo>
- npm install

# Developing/Writing

- Edit files under src/*, specifically src/pages/*.
- npm run build
- npm run preview
- Visit http://localhost:8888
- Git add, git commit like normal
- If you want to preview changes, create pull request
- If you want to merge and change production immediately, merge into master
