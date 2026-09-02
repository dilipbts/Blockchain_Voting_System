import * as faceapi from "face-api.js";

export async function loadLabeledImages() {
  const labels = ["alwin", "voter1", "voter2", "voter3", "voter4", "voter5", "voter6", "voter7", "voter8", "voter9", "voter10"];

  return Promise.all(
    labels.map(async label => {
      const imgUrl = `/voters/${label}.jpg`;
      const img = await faceapi.fetchImage(imgUrl);
      const detections = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        throw new Error(`No face detected in ${label}.jpg`);
      }

      return new faceapi.LabeledFaceDescriptors(label, [detections.descriptor]);
    })
  );
}
