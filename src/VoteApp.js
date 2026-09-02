import React, { useEffect, useState, useRef } from "react";
import { init, contract, accounts, web3 } from "./VotingPortal";
import * as faceapi from "face-api.js";

function VoteApp() {
  const [votes, setVotes] = useState({ Alice: 0, Bob: 0, Charlie: 0 });
  const [faceMatcher, setFaceMatcher] = useState(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef();

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        
        // Initialize Web3 and contract
        await init();
        console.log("✅ Web3 and Contract initialized");
        
        // Load votes from events
        await loadVotesFromEvents();
        
        // Load face-api models
        console.log("Loading face detection models...");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        console.log("✅ Models loaded");
        
        // Load voter dataset
        const labeledDescriptors = await loadLabeledImages();
        if (labeledDescriptors.length > 0) {
          setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.6));
          console.log(`✅ Loaded ${labeledDescriptors.length} faces`);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Initialization error:", err);
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load votes from blockchain events
  async function loadVotesFromEvents() {
    try {
      console.log("Loading votes from events...");
      
      const events = await contract.getPastEvents('Voted', {
        fromBlock: 0,
        toBlock: 'latest'
      });
      
      let aliceCount = 0, bobCount = 0, charlieCount = 0;
      events.forEach(event => {
        const candidateId = parseInt(event.returnValues.candidateId);
        if (candidateId === 1) aliceCount++;
        else if (candidateId === 2) bobCount++;
        else if (candidateId === 3) charlieCount++;
      });
      
      setVotes({ Alice: aliceCount, Bob: bobCount, Charlie: charlieCount });
      console.log(`✅ Votes loaded: Alice=${aliceCount}, Bob=${bobCount}, Charlie=${charlieCount}`);
      
    } catch (error) {
      console.error("Failed to load events:", error);
    }
  }

  async function loadLabeledImages() {
    const labels = ["alwin", "voter1", "voter2", "voter3", "voter4", "voter5", "voter6", "voter7", "voter8", "voter9", "voter10"];
    
    const results = await Promise.all(
      labels.map(async label => {
        try {
          const imgUrl = `/voters/${label}.jpg`;
          const img = await faceapi.fetchImage(imgUrl);
          const detections = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
          
          if (detections) {
            console.log(`✅ Loaded face: ${label}`);
            return new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
          }
          return null;
        } catch (err) {
          console.log(`⚠️ No face image for: ${label}`);
          return null;
        }
      })
    );
    
    return results.filter(r => r !== null);
  }

  async function startCamera(candidateId) {
    const candidateName = candidateId === 1 ? "Alice" : candidateId === 2 ? "Bob" : "Charlie";
    
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          resolve();
        };
      });
      
      // Wait a bit for camera to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Detect face
      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();
      
      // Stop camera
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      
      if (detections.length === 0) {
        alert("❌ No face detected! Please position your face in front of the camera.");
        return;
      }
      
      if (!faceMatcher) {
        alert("❌ Face recognition not ready. Please wait.");
        return;
      }
      
      const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
      console.log("Detected voter:", bestMatch.label, "Distance:", bestMatch.distance);
      
      if (bestMatch.label !== "unknown") {
        // Get all available Ganache accounts
        const accountsList = await web3.eth.getAccounts();
        console.log("Available accounts:", accountsList);
        
        // Map each face label to a specific Ganache account
        const accountMap = {
          "alwin": accountsList[0],   // Your account
          "voter1": accountsList[1],   // Friend 1
          "voter2": accountsList[2],   // Friend 2
          "voter3": accountsList[3],   // Friend 3
          "voter4": accountsList[4],   // Friend 4
          "voter5": accountsList[5],   // Friend 5
          "voter6": accountsList[6],   // Friend 6
          "voter7": accountsList[7],   // Friend 7
          "voter8": accountsList[8],   // Friend 8
          "voter9": accountsList[9],   // Friend 9
          "voter10": accountsList[0]   // Fallback to account 0
        };
        
        const fromAccount = accountMap[bestMatch.label] || accountsList[0];
        console.log(`✅ Voting from account: ${fromAccount} for face: ${bestMatch.label}`);
        
        // Check if this account has already voted
        const hasVoted = await contract.methods.voters(fromAccount).call();
        if (hasVoted) {
          alert(`❌ ${bestMatch.label} has already voted! Each person can only vote once.`);
          return;
        }
        
        // Cast vote from the mapped account
        const result = await contract.methods.vote(candidateId).send({ 
          from: fromAccount, 
          gas: 300000 
        });
        
        console.log("✅ Vote successful!", result);
        
        // Refresh votes after voting
        await loadVotesFromEvents();
        
        alert(`✅ Vote cast successfully by ${bestMatch.label} for ${candidateName}!`);
      } else {
        alert("❌ Face not recognized! You are not registered to vote.");
      }
    } catch (err) {
      console.error("Voting error:", err);
      
      // Stop camera if error
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      if (err.message.includes("Already voted")) {
        alert("❌ You have already voted! Each person can only vote once.");
      } else if (err.message.includes("Invalid candidate")) {
        alert("❌ Invalid candidate selected.");
      } else {
        alert(`❌ Error casting vote: ${err.message}`);
      }
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>Loading Voting System...</h2>
        <p>Please wait while we initialize the system.</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>🗳️ Voting System with Face Recognition</h2>
      
      {/* Refresh Button */}
      <button 
        onClick={loadVotesFromEvents} 
        style={{ 
          padding: "10px 20px", 
          marginBottom: "20px", 
          backgroundColor: "#666", 
          color: "white", 
          border: "none", 
          borderRadius: "5px", 
          cursor: "pointer" 
        }}
      >
        🔄 Refresh Votes
      </button>
      
      {/* Vote Count Display */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        gap: "40px", 
        margin: "30px 0",
        padding: "20px",
        backgroundColor: "#f0f0f0",
        borderRadius: "10px"
      }}>
        <div>
          <h3>👩 Alice</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>{votes.Alice}</p>
        </div>
        <div>
          <h3>👨 Bob</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>{votes.Bob}</p>
        </div>
        <div>
          <h3>🧑 Charlie</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold" }}>{votes.Charlie}</p>
        </div>
      </div>

      {/* Vote Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "20px" }}>
        <button 
          onClick={() => startCamera(1)} 
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Vote for Alice
        </button>
        <button 
          onClick={() => startCamera(2)}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Vote for Bob
        </button>
        <button 
          onClick={() => startCamera(3)}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            backgroundColor: "#FF9800",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          Vote for Charlie
        </button>
      </div>

      {/* Hidden Video Element */}
      <video 
        ref={videoRef} 
        autoPlay 
        muted 
        width="400" 
        height="300" 
        style={{ 
          border: "2px solid #ccc", 
          borderRadius: "10px",
          display: "none"
        }} 
      />
      
      <p style={{ color: "#666", fontSize: "14px" }}>
        ℹ️ Click a button above to vote. Your face will be verified via webcam.
      </p>
    </div>
  );
}

export default VoteApp;