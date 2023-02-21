import { useState, useEffect, useRef } from 'react';
import { OpenVidu } from 'openvidu-browser';
import UserVideo from './UserVideo';
import { getToken } from '../public/createToken';
import axios from 'axios';

export default function OpenViduComponent() {

    const [OV, setOV] = useState(null);

    const [mySessionId, setMySessionId] = useState('SessionA');
    const [myUserName, setMyUserName] = useState(`Participant${Math.floor(Math.random() * 100)}`);
    const [session, setSession] = useState(undefined);
    const [mainStreamManager, setMainStreamManager] = useState(undefined);
    const [publisher, setPublisher] = useState(undefined);
    const [subscribers, setSubscribers] = useState([]);

    const currentVideoDeviceRef = useRef(null);

    useEffect(() => {
        window.addEventListener('beforeunload', onbeforeunload);
        return () => {
            window.removeEventListener('beforeunload', onbeforeunload);
        };
    }, []);

    const sendSignal = async () => {
        const response = await axios.post('https://ena.jegal.shop:8080/mofit/gameStart', { session: mySessionId });
    }

    const onbeforeunload = (event) => {
        leaveSession();
    };

    const handleChangeSessionId = event => setMySessionId(event.target.value);
    const handleChangeUserName = event => setMyUserName(event.target.value);

    const deleteSubscriber = (streamManager) => {
        let newSubscribers = subscribers;
        let index = newSubscribers.indexOf(streamManager, 0);
        if (index > -1) {
            newSubscribers.splice(index, 1);
            setSubscribers(newSubscribers)
        }
    }

    const leaveSession = () => {
        const mySession = session;

        if (mySession) {
            mySession.disconnect();
        }
        setOV(null);
        setSession(undefined);
        setSubscribers([]);
        setMySessionId('SessionA');
        setMyUserName(`Participant${Math.floor(Math.random() * 100)}`);
        setMainStreamManager(undefined);
        setPublisher(undefined);
    }

    useEffect(() => {
        if (session !== undefined) {
            var mySession = session;

            mySession.on('streamCreated', (event) => {
                // Subscribe to the Stream to receive it. Second parameter is undefined
                // so OpenVidu doesn't create an HTML video by its own
                var newsubscriber = mySession.subscribe(event.stream, undefined);
                //var newSubscribers = subscribers;
                //newSubscribers.push(newsubscriber);
                // Update the state with the new subscribers
                setSubscribers([...subscribers, newsubscriber]);
            });

            // On every Stream destroyed...
            mySession.on('streamDestroyed', (event) => {
                // Remove the stream from 'subscribers' array
                deleteSubscriber(event.stream.streamManager);
            });

            // On every asynchronous exception...
            mySession.on('start', (event) => {
                console.log(event.data); // Message
                //console.log(event.from); // Connection object of the sender
                console.log(event.type); // The type of message
            });

            // On every asynchronous exception...
            mySession.on('exception', (exception) => {
                console.warn(exception);
            });

            getToken(mySessionId).then((token) => {
                // First param is the token got from the OpenVidu deployment. Second param can be retrieved by every user on event
                // 'streamCreated' (property Stream.connection.data), and will be appended to DOM as the user's nickname
                mySession.connect(token, { clientData: myUserName })
                    .then(async () => {
                        // --- 5) Get your own camera stream ---

                        // Init a publisher passing undefined as targetElement (we don't want OpenVidu to insert a video
                        // element: we will manage it on our own) and with the desired properties
                        let publisher = await OV.initPublisherAsync(undefined, {
                            audioSource: undefined, // The source of audio. If undefined default microphone
                            videoSource: undefined, // The source of video. If undefined default webcam
                            publishAudio: true, // Whether you want to start publishing with your audio unmuted or not
                            publishVideo: true, // Whether you want to start publishing with your video enabled or not
                            resolution: '320x240', // The resolution of your video
                            frameRate: 30, // The frame rate of your video
                            insertMode: 'APPEND', // How the video is inserted in the target element 'video-container'
                            mirror: false, // Whether to mirror your local video or not
                        });

                        // --- 6) Publish your stream ---

                        mySession.publish(publisher);

                        // Obtain the current video device in use
                        var devices = await OV.getDevices();
                        var videoDevices = devices.filter(device => device.kind === 'videoinput');
                        var currentVideoDeviceId = publisher.stream.getMediaStream().getVideoTracks()[0].getSettings().deviceId;
                        var currentVideoDevice = videoDevices.find(device => device.deviceId === currentVideoDeviceId);

                        // Set the main video in the page to display our webcam and store our Publisher
                        currentVideoDeviceRef.current = currentVideoDevice;
                        setMainStreamManager(publisher);
                        setPublisher(publisher);
                    })
                    .catch((error) => {
                        console.log('There was an error connecting to the session:', error.code, error.message);
                    });
            });

        }
    }, [session]);

    const joinSession = async () => {
        const newOV = new OpenVidu();
        newOV.enableProdMode();
        setOV(newOV);

        const newSession = newOV.initSession();
        setSession(newSession);
    }

    return (
        <div className="container">
            {session === undefined ? (
                <div id="join">
                    <div id="join-dialog" className="jumbotron vertical-center">
                        <h1> Join a video session </h1>
                        <form className="form-group" onSubmit={joinSession}>
                            <p>
                                <label>Participant: </label>
                                <input
                                    className="form-control"
                                    type="text"
                                    id="userName"
                                    value={myUserName}
                                    onChange={handleChangeUserName}
                                    required
                                />
                            </p>
                            <p>
                                <label> Session: </label>
                                <input
                                    className="form-control"
                                    type="text"
                                    id="sessionId"
                                    value={mySessionId}
                                    onChange={handleChangeSessionId}
                                    required
                                />
                            </p>
                            <p className="text-center">
                                <input className="btn btn-lg btn-success" name="commit" type="submit" value="JOIN" />
                            </p>
                        </form>
                    </div>
                </div>
            ) : null}
            {session !== undefined ? (
                <div id="session">
                    <div id="session-header">
                        <h1 id="session-title">{mySessionId}</h1>
                        <input
                            className="btn btn-large btn-danger"
                            type="button"
                            id="buttonLeaveSession"
                            onClick={leaveSession}
                            value="Leave session"
                        />
                    </div>
                    {mainStreamManager !== undefined ? (
                        <div id="main-video" className="col-md-6">
                            <UserVideo streamManager={mainStreamManager} />
                            <button onClick={sendSignal}>클릭하기</button>
                        </div>
                    ) : null}
                    <div id="video-container" className="col-md-6">
                        {subscribers.map((sub, i) => (
                            <div key={i} className="stream-container col-md-6 col-xs-6">
                                <UserVideo streamManager={sub} />
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
} 