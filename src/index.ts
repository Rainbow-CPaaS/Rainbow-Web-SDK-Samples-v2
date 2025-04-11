import { Call, CallEvents, CallsPlugin, ConnectedUser, ConnectionServiceEvents, ConnectionState, Conversation, ConversationServiceEvents, DirectorySearchResults, DirectoryType, LogLevelEnum, RainbowSDK, RBEvent, User } from 'rainbow-web-sdk';

// Personnal configuration for the SDK APP; If you need help, please read the starting guides on how to obtain the key / secret
// and update the appConfig in the config file.
import { appConfig } from './config/config';


// import { appConfig } from './config/myConfig';

class TestApplication {
    protected rainbowSDK: RainbowSDK;

    private connectedUser: ConnectedUser;

    //will help to manage the list of calls
    private calls: Record<string, any> = {};

    //to beo unsubscribed on log-out to avoid memory leak
    private conversationCallSubscription;

    constructor() {
    }

    public async init() {
        if (appConfig?.applicationId === "applicationId" || appConfig?.secretKey === "secretKey") {
            window.alert("No application ID or secret key are set for this application ! Refer to the README file");
            return;
        }

        this.rainbowSDK = RainbowSDK.create({
            appConfig: {
                server: appConfig.server,
                applicationId: appConfig.applicationId,
                secretKey: appConfig.secretKey
            },
            plugins: [CallsPlugin],
            autoLogin: true,
            logLevel: LogLevelEnum.WARNING
        });

        this.rainbowSDK.connectionService.subscribe((event: RBEvent) =>
            this.connectionStateChangeHandler(event), ConnectionServiceEvents.RAINBOW_ON_CONNECTION_STATE_CHANGE);


        // Show the loading spinner
        document.getElementById('loading-spinner').style.display = 'block';

        this.connectedUser = await this.rainbowSDK.start();

        //hide loading spinner
        document.getElementById('loading-spinner').style.display = 'none';

        if (!this.connectedUser) {
            document.getElementById('loginContainer').style.display = 'block';
            //show your login page here
            this.manageLoginForm();
        }
        else {
            this.showMainPage();
        }
    }

    private connectionStateChangeHandler(event: RBEvent): void {
        const connectionState: ConnectionState = event.data;
        console.info(`[testAppli] onConnectionStateChange ${connectionState.state}`);
    }

    private manageLoginForm() {
        const form = document.getElementById('loginForm') as HTMLFormElement;
        const usernameInput = document.getElementById('username') as HTMLInputElement;
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        const errorMessage = document.getElementById('error-message') as HTMLParagraphElement;

        // Handle form submission
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                // Show error if any field is empty
                errorMessage.textContent = 'Both fields are required!';
            } else {
                // Show the loading spinner
                document.getElementById('loginContainer').style.display = 'none';
                document.getElementById('loading-spinner').style.display = 'block';
                try { this.connectedUser = await this.rainbowSDK.connectionService.logon(username, password, true); }
                catch (error: any) {
                    document.getElementById('loginContainer').style.display = 'block';
                    console.error(`[testAppli] ${error.message}`);
                    alert(`Login error for ${username}`);
                    return;
                }
                // Clear error message and simulate login
                errorMessage.textContent = '';

                //hide loading spinner
                document.getElementById('loading-spinner').style.display = 'none';

                this.showMainPage();
            }
        });
    }

    private showMainPage() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('mainPage').style.display = 'flex';
        const usernameElement = document.getElementById('username');
        const companyElement = document.getElementById('company');
        const avatarElement: any = document.getElementById('avatar');

        usernameElement.textContent = this.connectedUser.displayName;
        companyElement.textContent = this.connectedUser.company?.name;
        avatarElement.src = this.connectedUser.avatar?.src;

        this.manageCalls();

        const searchQueryInput: any = document.getElementById('search-query');
        const searchButton = document.getElementById('search-btn');
        const searchResultsContainer = document.getElementById('search-results');

        // Handle search functionality
        searchButton.addEventListener('click', async () => {
            const searchQuery = searchQueryInput.value.trim();
            searchResultsContainer.innerHTML = '';

            if (!searchQuery) {
                alert('Please enter a search query.');
                return;
            }

            const result: DirectorySearchResults = await this.rainbowSDK.directorySearchService.searchByName(searchQuery, DirectoryType.RAINBOW_USERS, { limit: 5 });

            // The directorySearch engine returns a DirectorySearchResults objevt.
            // It contains an array of User instance which match the criteria 
            // Note that this array can be empty if no matching entity is found.
            // In our case we have already created a "Bob" user in a previous stage, 
            // so, this array should not be empty...
            const users: User[] = result.users;


            users.forEach(result => {
                const resultCard = document.createElement('div');
                resultCard.classList.add('result-card');

                resultCard.innerHTML = `
                    <img src="${result.avatar?.src}" alt="Avatar" />
                    <h4>${result.displayName}</h4>
                    <p>${result.company?.name}</p>
                    <button class="call-btn">Call</button>
                `;

                searchResultsContainer.appendChild(resultCard);

                const callButton = resultCard.querySelector('.call-btn');
                if (callButton) {
                    callButton.addEventListener('click', () => this.makeCall(result));
                }
            });
        });
    }

    /**
     * NOTE: You should test the capability if we can actually call the user.
     * 
     */
    public async makeCall(user: User) {
        const searchResultsContainer = document.getElementById('search-results');
        searchResultsContainer.innerHTML = '';

        //make call to user
        try {
            await this.rainbowSDK.callService.makeWebCall(user);
        }
        catch (error) {
            //manage error
        }
    }


    /**
     * Here we manage ALL calls. It's pretty simple : If there's a new call (incoming or outgoing), we'll have an event;
     * If the call is removed (ended/rejected/whatever reason): there's event;
     */
    private manageCalls() {
        this.conversationCallSubscription = this.rainbowSDK.conversationService?.subscribe((event: RBEvent<ConversationServiceEvents>) => {
            try {
                const conversation: Conversation = event.data.conversation;

                switch (event.name) {
                    case ConversationServiceEvents.ON_NEW_CALL_IN_CONVERSATION:
                        this.onCallConversationCreated(conversation);
                        break;

                    case ConversationServiceEvents.ON_REMOVE_CALL_IN_CONVERSATION:
                        this.onCallConversationRemoved(conversation);
                        break;

                    default:
                        break;
                }
            }
            catch (error) {
                //do something 
            }
        }, [ConversationServiceEvents.ON_NEW_CALL_IN_CONVERSATION,
        ConversationServiceEvents.ON_REMOVE_CALL_IN_CONVERSATION]);
    }

    /**
     * 
     * We build the call cell for the new call. The available buttons should be taken from the CALL capabilities to be sure what actions
     * are allowed for the call, like taking it, releasing, mute, hold, etc etc
     */
    private onCallConversationCreated(conversation: Conversation) {
        //we've new conversation call, build the card and list to updates on the call so that we can update the buttons / status accordingly
        const callCardsContainer: any = document.getElementById('call-cards-container');

        const cardElement = document.createElement('div');
        //give ID to the card
        cardElement.id = conversation.call.id;
        cardElement.classList.add('call-card');

        cardElement.innerHTML = `
            <img src="${conversation.call?.contact?.avatar?.src}" alt="Avatar" />
            <h4>${conversation.call?.contact?.displayName}</h4>
            <p class="call-status">${conversation.call?.callStatus}</p>
            <button class="call-btn hidden">Answer</button>
            <button class="call-end-btn hidden">End</button>
            <button class="mute-btn hidden">Mute</button>
            <button class="unmute-btn hidden">Unmute</button>
        `;

        callCardsContainer.appendChild(cardElement);

        const answerButton = cardElement.querySelector('.call-btn');
        if (answerButton) {
            answerButton.addEventListener('click', () => this.answerCall(conversation.call));
        }

        const callButton = cardElement.querySelector('.call-end-btn');
        if (callButton) {
            callButton.addEventListener('click', () => this.releaseCall(conversation.call));
        }

        //add mute/unmute actions, but only show the buttons if the call capability is TRUE for this action
        const muteButton = cardElement.querySelector('.mute-btn');
        if (muteButton) {
            muteButton.addEventListener('click', () => this.muteCall(conversation.call));
        }

        const unmuteButton = cardElement.querySelector('.unmute-btn');
        if (unmuteButton) {
            unmuteButton.addEventListener('click', () => this.unmuteCall(conversation.call));
        }

        //update the call buttons based on the capabilities
        this.manageCallButtons(conversation.call);

        //add listeners for this call so that I can remove it after the call is ended
        //there're 100 ways to do this, so you can do it as you want, just remember to unsubscribe at the end of the call
        //as this might lead to memory leak.
        this.calls[conversation.call.id] = {}

        this.calls[conversation.call.id].subcription = conversation.call.subscribe((event: RBEvent<CallEvents>) => {
            switch (event.name) {
                case CallEvents.ON_CALL_STATUS_CHANGE:
                case CallEvents.ON_CALL_CAPABILITIES_UPDATED:
                case CallEvents.ON_CALL_MEDIA_UPDATED:
                case CallEvents.ON_CALL_MUTE_CHANGE:
                    //to make it simple, I'll manage the call status and the call buttons at the same place; For more "fine" management, each event 
                    //contains information that will allow to update any part of the UI / actions separately, if needed.
                    this.manageCallButtons(conversation.call);
                    break;
                default: break;
            }
        });
    }

    private manageCallButtons(call: Call) {
        //for each capability, set the visbility of the button to TRUE or FALSE
        //get the call card by it's id
        //it,s a workaround to use an unique ID;
        const cardElement = document.getElementById(call["id"]);

        //update the call status
        const callStatus = cardElement.querySelector('.call-status');
        callStatus.innerHTML = call.callStatus;

        const answerButton = cardElement.querySelector('.call-btn');
        if (answerButton) {
            //if capability answer is true, show button, otherwise hide it
            answerButton.classList.toggle("hidden", !call.capabilities.answer);
        }

        const callButton = cardElement.querySelector('.call-end-btn');
        if (callButton) {
            callButton.classList.toggle("hidden", !call.capabilities.release);
        }

        //add mute/unmute actions, but only show the buttons if the call capability is TRUE for this action
        const muteButton = cardElement.querySelector('.mute-btn');
        if (muteButton) {
            muteButton.classList.toggle("hidden", !call.capabilities.mute);
        }

        const unmuteButton = cardElement.querySelector('.unmute-btn');
        if (unmuteButton) {
            unmuteButton.classList.toggle("hidden", !call.capabilities.unmute);
        }

        //do for all buttons that we want to manage
    }

    private muteCall(call: Call) {
        call.mute();
    }

    private unmuteCall(call: Call) {
        call.unmute();
    }

    private async releaseCall(call: Call) {
        //relase call
        try {
            await call.release();
        }
        catch (error) {
            //manage error
        }
    }

    private async answerCall(call: Call) {
        //answer call
        try {
            await call.answer();
        }
        catch (error) {
            //manage error
        }
    }

    //remove the call as it's ended
    private onCallConversationRemoved(conversation) {
        //remove conversation call from the UI, as call is ended
        const cardElement = document.getElementById(conversation.call.id);

        //remove the card
        cardElement?.remove();
        //remove subscriptions
        this.calls[conversation.call.id]?.subcription?.unsubscribe();
        delete this.calls[conversation.call.id];

    }
}

const testApplication = new TestApplication();
testApplication.init();