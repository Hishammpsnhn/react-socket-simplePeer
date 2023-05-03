import React, { useEffect, useRef, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import Peer from "simple-peer";

function Chat({ socket, username, room }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [me, setMe] = useState()
  const [stream, setStream] = useState()
  const [receivingCall, setReceivingCall] = useState(false)
  const [caller, setCaller] = useState("")
  const [callerSignal, setCallerSignal] = useState()
  const [name, setName] = useState("")
  const [callAccepted, setCallAccepted] = useState(false)
  const [callEnded, setCallEnded] = useState(false)

  const myVideo = useRef()
  const userVideo = useRef()
  const connectionRef = useRef()

  useEffect(() => {

    socket.on("me", (id) => {
      setMe(id)
    })

    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
    });

    socket.on("callUser", (data) => {
      console.log(data)
      setReceivingCall(true)
      setCaller(data.from)
      setName(data.name)
      setCallerSignal(data.signal)
    })
  }, []);

  const sendMessage = async () => {
    if (currentMessage !== "") {
      const messageData = {
        room: room,
        author: username,
        message: currentMessage,
        time:
          new Date(Date.now()).getHours() +
          ":" +
          new Date(Date.now()).getMinutes(),
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
    }
  };

  const handleCall = async (id) => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    setStream(stream)
    myVideo.current.srcObject = stream

    console.log("my stream", stream)

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    })
    peer.on("signal", (data) => {
      console.log("my signal", data)
      socket.emit("callUser", {
        room: room,
        signalData: data,
        from: me,
        name: username
      })
    })

    peer.on("stream", (stream) => {
      console.log("stream")
      userVideo.current.srcObject = stream
    })


    socket.on("callAccepted", (signal) => {
      console.log("callAccepted", signal)
      peer.signal(signal)
      setCallAccepted(true)
    })

    connectionRef.current = peer
  }

  const handleAnswerCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setStream(stream)
      myVideo.current.srcObject = stream
      setCallAccepted(true)

      console.log("my stream", stream)
      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream
      })

      peer.on("signal", (data) => {
        console.log("my signal", data)
        socket.emit("answerCall", { signal: data, to: caller })
      })

      peer.on("stream", (stream) => {
        console.log("received stream:", stream)
        userVideo.current.srcObject = stream
      })
      if (callerSignal) {
        console.log("callerSignal:", callerSignal)
        peer.signal(callerSignal)
      }
      connectionRef.current = peer


    } catch (error) {
      console.log("somewhere eeror ", error)
    }
  }

  return (
    <div className="chat-window">
      {receivingCall && <div>{name} is calling ......<button onClick={handleAnswerCall}>answer</button></div>}
      {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px", background: 'green' }} />}
      {callAccepted && !callEnded ?
        <video playsInline ref={userVideo} autoPlay style={{ width: "300px", background: 'red' }} /> :
        null}
      <div className="chat-header">
        <p>Live Chat</p>
      </div>
      <button onClick={() => handleCall(me)}>Call</button>
      <div className="chat-body">
        <ScrollToBottom className="message-container">
          {messageList.map((messageContent) => {
            return (
              <div
                className="message"
                id={username === messageContent.author ? "you" : "other"}
              >
                <div>
                  <div className="message-content">
                    <p>{messageContent.message}</p>
                  </div>
                  <div className="message-meta">
                    <p id="time">{messageContent.time}</p>
                    <p id="author">{messageContent.author}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollToBottom>
      </div>
      <div className="chat-footer">
        <input
          type="text"
          value={currentMessage}
          placeholder="Hey..."
          onChange={(event) => {
            setCurrentMessage(event.target.value);
          }}
          onKeyPress={(event) => {
            event.key === "Enter" && sendMessage();
          }}
        />
        <button onClick={sendMessage}>&#9658;</button>
      </div>
    </div>
  );
}

export default Chat;