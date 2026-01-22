
<!-- <h1 align="center" style="font-family: 'Poppins', sans-serif; text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.5);">Veeto</h1> -->
# Veto

## Background
Veto was inspired by the many occurrences where my partner and I struggled to decide where to eat, 
often spending more time second-guessing our options than enjoying a meal. 
Our indecisiveness led me to create a solution a website designed to help simplify the decision-making process. 
Unlike existing tools that merely list nearby restaurants, Veto takes user preferences into account to make a tailored recommendation. 
My goal is for others who face the same dilemma to find this platform just as helpful.

## Tech Stack
> Javascript | 
> React | 
> Express

## Directory Structure 
    client/                contains all files for frontend
        src/               contains all source files
            assets/        contains images i.e avatar pfp
            components/    contains components from shadcn, aceternity, etc 
            lib/           contains util.js used for tailwind css
            pages/         contains the pages of the website 
    server/                contains all files for backend
        index.js           backend file for business logic

## Installation
You can install the project using the following command
```
git clone https://github.com/c-lorenzo76/Veeto.git
```

## Start the server
In terminal run the commands to start the server, 
and it will run on localhost:8000
```
cd server
npm i 
npm start
```

## Start the client
The open another terminal, navigate to client folder and run the following commands,
it will run on localhost:5173
```
cd client
npm i
npm run dev
```

## Landing Page
![landing_page.jpg](./client/public/landing_page.jpg)

## Create Page
![create.jpg](./client/public/create.jpg)

## Join Page
![join.jpg](./client/public/join.jpg)

## Lobby Page
![lobby.jpg](./client/public/lobby.jpg)

## Questions Page
![question.jpg](./client/public/question.jpg)

## Results Page
![results.jpg](./client/public/results.jpg)

### Updates
12/12/25<br>
TODO:
<br>
- When a new user enters the game, instead of displaying the name below the players already in there
they get placed right next to the latest ones. Matter of fact it just keeps expanding. (might be fixed)
<br>
- The disconnect isn't working no more 
<br>
- The host won't be able to see their avatar in lobby. 
<br>
- See if I can make this in Java Spring instead

11/12/25<br>
TODO:
- Fix UI on results page: Have the progress bar and the header be the same width as the results, change the bg color of the header, 
have the Results look a bit different (rating being stars, price level being $$$ instead of dollars (leave a guide on the top that 
translates what the amount should be based on dollar signs), get rid of the image)
<br>
- )Adjust the backend logic to be more accurate with the results. There are some excessive calls as well. 

09/28 <br>
I fixed the lobby.jsx error. I need to fix it how you view it on mobile. It doesn't look that well. 
I also need to finish the backend implementation of the results because it doesn't display off the 
users choices. I also need to edit the results page and make it so that it shows only 5 at first 
and allows for pagination. Tomorrow I'll add it so its on an EC2 host or close to be able to have 
it on a EC2 host. I also need to view what domains are available.  
<br>
09/26 <br>
I haven't fully finished the Results page. I'm having trouble when I don't hardcode the location. 
It was showing me places all the way at New York no matter how far I set the distance. 
Other issues I'm having is that I am not able to make the query based of the selections. 
I am also going to have to figure out how to display the images of the locations. 
Also apply a hyperlink to the places based of the uri or whatever. Make the ratings show stars as well. 
The price level not sure whether to have the dollar sign or just maintain it the way it is. 
Oh and make the progress bar shorter that shit takes up too much space. I have a lot
to go over. I think I'm jsut going to make it be on the web and will then make the changes. 
<br>
09/16 <br>
A way I was thinking of keeping track based of priority I can make a switch statement
so in the backend I have three separate arrays with the questions based of the 
top priority. Then when the first question gets answered it appends the following 
questions based of the response. Right now I want to make it so that in the page
'Create.jsx' it pulls the location of the host and stores it in the backend 
'Lobbies'. I need to add a new variable named 'location' don't know if I want 
to store the latitude and longitude or the city location. 
<br>
I managed to store the lat and long in the lobbies only from the Create page. Now
the only thing I need to debug is to set an alert for when a user clicks no that
explains it requires the location and that it cant work without it. The next thing
I need to do is to allow to display the allow or not after they click no and they retry.
Because they have to refresh the page in order for it to appear again.
<br>
I finished the Google Account set up. I'm going to use Google Cloud Platform for the API. 
Specifically use the 'Places API (New)'. Now I managed to get the Questions to navigate
to 'Results.jsx' once the questions is finished. I just need to figure out how to do the 
API call. Okay if I'm not mistaken the API is free until I reach a limit of 11,765 free req
for each month. Now unless there's some asshole that does a script to fuck me over I should 
be good with that the alternative was Yelp Fusion API. Anyways I just need to finish the 
Results page and then the project is practically done. I would just go back and do those 
minor changes. Good shit.


09/15 <br>
I finished the voting poll feature it works properly. I just now need
to make a new page that shows the results. For right now I don't know how to 
properly work around the priority of the input and how to display only 
relevant questions for that. I will figure that AFTER doing the results page. 
I also fixed the 'disconnect' socket via backend for when a user would leave 
their votes would stay in the 'lobby[lobbyCode]', it now deletes them. I also
fixed the progress bar in 'Questions.jsx'. I do need to make the Questions fit 
in the box a bit better when the window is minimized. I still need to fix that 
error in lobby.jsx -> Check the render method of `Lobby`. See
https://reactjs.org/link/warning-keys for more information. So my next top 
priorities is to display the results and maybe set it up on a server computer. 
Then it would be to go back to other pages and fix some other mistakes. 
For instance the language selector, navigating every user in the lobby to main
menu when the host disconnects, leave option in lobby and in-game, kick option
from lobby for the host, removing the annoying 'copied to clipboard' from lobby
make it just a popup not something you have to click out of. Actually testing it
there seems to be an error when someone leaves mid-game it doesn't advance even if 
the host continues voting. 

09/13 <br>
I followed on the approach of having 'lobbyInfo' to be able to update 'users'. 
Then that's how I kept track of the users connected since I would just use 
'users.length'. Then I added the 'userDisconnect' from 'Lobby.jsx' for when
a user disconnects from the socket. I've also managed to pull the information
for 'vote' on the backend via the parameters, so I can manage to move onto voting.
The thing I can see that I would struggle would be keeping track of everyone in the
'users' that have voted to then proceed to the next question. Once I get the question
tracking working I should focus on the progress bar as well. Then in the meantime while
I figure out how to make it display the searches based on the results. Oh, btw
check how to fix the error that I still keep getting in the 'Lobby.jsx'. Then
also view how to make not many socket requests only when needed. The 'lobbyInfo' 
for example makes a lot of rq when just one person is in the lobby. On a larger scale
this could make it expensive especially on the cloud. 


09/09 <br>
I still have to finish the Questions.jsx with the voting feature. 
Found a temp solution to the player count but has problems when
a user disconnects as it does not update. Did a minor 
change to use the disconnect that is already in index.js but for 
some reason it would also pass onto the lobby.jsx, so it would remove it twice? Was acting off. 
Might have to make two different disconnects?? I think I just need a better way of checking for user count,
maybe actually store all the users and then just use length similar to lobbyinfo. 
I need to also adjust the Lobby.jsx sockets or just the sockets in general. 
Figure out how to have it run only when required I have that shit constantly 
emitting. Still continuing to have teh issue in Lobby.jsx with that long error check 
if motion has anything to do with it. START TO PUT IT ONTO A SERVER BY END OF WEAK PLEASE. 

09/04 <br>
I fixed the issue of only the host being redirected to Questions page. I now need to add the voting
implementation. After I need to adjust it to become a multistep form. Once those two things are in play 
I can make it show the results from the poll. Have it display places to eat according to the responses 
May need to create a new Google account to be able to make requests based off coordinates or see other 
API uses. Maybe don't even need that and could use TripAdvisor API.
Warning: Each child in a list should have a unique "key" prop.

error for something I don't know what

Check the render method of `Lobby`. See https://reactjs.org/link/warning-keys for more information.
MotionComponent@http://localhost:5173/node_modules/.vite/deps/framer-motion.js:475:40
Lobby@http://localhost:5173/src/pages/Lobby.jsx:27:31
SocketProvider@http://localhost:5173/src/SocketContext.jsx:22:5
RenderedRoute@http://localhost:5173/node_modules/.vite/deps/react-router-dom.js:4011:32
Routes@http://localhost:5173/node_modules/.vite/deps/react-router-dom.js:4444:19
UserProvider@http://localhost:5173/src/UserContext.jsx:26:6
Router@http://localhost:5173/node_modules/.vite/deps/react-router-dom.js:4387:28
BrowserRouter@http://localhost:5173/node_modules/.vite/deps/react-router-dom.js:5132:26
App

08/30 <br>
Okay I believe I fixed the issue with navigating and maintaining the connection of the socket. Had some issues resolving that, but now I am able to continue 
to navigate without any hiccups. I might have to refactor my code as its all over the place. I also have lots of unnecessary
functions and emit that don't amount to nothing. So before we work on Questions.jsx tomorrow. I'll fix those issues first. 

08/28 <br>
Currently it is somewhat working. 
Having issues with navigating. 
When I start the game from Lobby, and it navigates I lose connection of the socket and therefore deletes lobbies[code]. 
Need to figure out how to maintain that when navigating might have to resolve by rewriting useSocket and UserContext. 




