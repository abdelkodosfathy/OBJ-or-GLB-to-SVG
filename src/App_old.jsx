// App.jsx
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

// import { optimize } from "svgo";

// const optimizeSVG = (svgString) => {
//   const result = optimize(svgString, {
//     multipass: true, // تحسين متعدد المراحل
//     plugins: [
//       // قائمة الإضافات الموصى بها
//       "removeDoctype",
//       "removeXMLProcInst",
//       "removeComments",
//       "removeMetadata",
//       "removeEditorsNSData",
//       "cleanupAttrs",
//       "mergeStyles",
//       "inlineStyles",
//       "minifyStyles",
//       "cleanupIDs",
//       "removeUselessDefs",
//       "cleanupNumericValues",
//       "convertColors",
//       "removeUnknownsAndDefaults",
//       "removeNonInheritableGroupAttrs",
//       "removeUselessStrokeAndFill",
//       "removeViewBox",
//       "cleanupEnableBackground",
//       "removeHiddenElems",
//       "removeEmptyText",
//       "convertShapeToPath",
//       "convertEllipseToCircle",
//       "moveElemsAttrsToGroup",
//       "moveGroupAttrsToElems",
//       "collapseGroups",
//       "convertPathData",
//       "convertTransform",
//       "removeEmptyAttrs",
//       "removeEmptyContainers",
//       "mergePaths",
//       "removeUnusedNS",
//       "sortDefsChildren",
//       "removeTitle",
//       "removeDesc",
//     ],
//   });

//   return result.data;
// };

export default function App() {
  const containerRef = useRef();
  const cameraRef = useRef();
  const sceneRef = useRef();
  const modelRef = useRef();
  const controlsRef = useRef();
  const rendererRef = useRef();
  // const raycaster = useRef(new THREE.Raycaster());
  // const pointer = useRef(new THREE.Vector2());
  // const highlightedRef = useRef(null);

  const [glbCamera, setGlbCamera] = useState(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    camera.lookAt(5, 5, 0);
    camera.updateMatrixWorld(); // 🔥 مهم

    cameraRef.current = camera;

    // اتجه الكاميرا
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    console.log("📸 cameraDir =", cameraDir.toArray());

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);

    const loader = new GLTFLoader();
    loader.load("scene.glb", (gltf) => {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          console.log("✅ Mesh found:", child.name || child.uuid);
          console.log("Geometry:", child.geometry); // ← تقدر تتحكم في كل واحد لوحده
        }
      });
    });

    loader.load("/base.glb", (gltf) => {
      const model = gltf.scene;
      scene.add(model);
      modelRef.current = model;

      const cameras = [];
      gltf.scene.traverse((child) => {
        if (child.isCamera) {
          cameras.push(child);
        }
      });

      if (cameras.length > 0) {
        console.log("📷 Camera found in model");
        setGlbCamera(cameras[0]);
      } else {
        console.warn("⚠️ No camera found in glb file.");
      }
    });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (
        containerRef.current &&
        renderer.domElement?.parentNode === containerRef.current
      ) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);
  useEffect(() => {
    let prevChildren = [];

    const interval = setInterval(() => {
      const scene = sceneRef.current;
      if (!scene) return;

      const currentChildren = scene.children;
      const added = currentChildren.filter(
        (child) => !prevChildren.includes(child)
      );

      if (added.length > 0) {
        console.log("📦 موديلات جديدة دخلت للمشهد:");
        added.forEach((obj) => console.log("🆕", obj.name || obj.type, obj));
        prevChildren = [...currentChildren];
      }
    }, 1000); // كل ثانية

    return () => clearInterval(interval);
  }, []);

  const goToModelCamera = () => {
    if (!glbCamera) {
      alert("لا توجد كاميرا داخل الملف.");
      return;
    }

    const cam = glbCamera;
    const mainCam = cameraRef.current;

    mainCam.position.copy(cam.position);
    mainCam.rotation.copy(cam.rotation);
    mainCam.quaternion.copy(cam.quaternion);
    mainCam.fov = cam.fov;
    mainCam.updateProjectionMatrix();

    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  function chainEdges(edges) {
    const chains = [];
    const used = new Set();

    for (let i = 0; i < edges.length; i++) {
      if (used.has(i)) continue;

      const chain = [];
      let currentEdge = edges[i];
      used.add(i);

      chain.push([currentEdge.ax, currentEdge.ay]);

      let endX = currentEdge.bx;
      let endY = currentEdge.by;

      while (true) {
        let found = false;

        for (let j = 0; j < edges.length; j++) {
          if (used.has(j)) continue;

          const { ax, ay, bx, by } = edges[j];

          const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2) < 1; // دقة التطابق

          if (dist(ax, ay, endX, endY)) {
            chain.push([ax, ay]);
            endX = bx;
            endY = by;
            used.add(j);
            found = true;
            break;
          } else if (dist(bx, by, endX, endY)) {
            chain.push([bx, by]);
            endX = ax;
            endY = ay;
            used.add(j);
            found = true;
            break;
          }
        }

        if (!found || Math.hypot(chain[0][0] - endX, chain[0][1] - endY) < 1) {
          break;
        }
      }

      if (chain.length > 2) {
        chains.push(chain);
      }
    }

    return chains;
  }

  function getVisibleSilhouetteEdges(mesh, camera) {
    const geometry = mesh.geometry;
    geometry.computeVertexNormals();
    geometry.computeFaceNormals?.();

    const position = geometry.attributes.position;
    const index = geometry.index;

    if (!index) return [];

    const vertices = position.array;
    const indices = index.array;

    const worldMatrix = mesh.matrixWorld;

    // بدل ما نحسب اتجاه الكاميرا الحقيقي، هنفترض إنه دايمًا نازل من فوق
    const cameraDir = new THREE.Vector3(0, 0, -1); // top-down
    cameraDir.applyMatrix4(mesh.matrixWorld.clone().invert()).normalize();

    const edgeMap = new Map();

    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i];
      const b = indices[i + 1];
      const c = indices[i + 2];

      const va = new THREE.Vector3(
        vertices[a * 3],
        vertices[a * 3 + 1],
        vertices[a * 3 + 2]
      ).applyMatrix4(worldMatrix);
      const vb = new THREE.Vector3(
        vertices[b * 3],
        vertices[b * 3 + 1],
        vertices[b * 3 + 2]
      ).applyMatrix4(worldMatrix);
      const vc = new THREE.Vector3(
        vertices[c * 3],
        vertices[c * 3 + 1],
        vertices[c * 3 + 2]
      ).applyMatrix4(worldMatrix);

      const normal = new THREE.Triangle(va, vb, vc).getNormal(
        new THREE.Vector3()
      );
      const facingCamera = normal.dot(cameraDir) < 0;

      const addEdge = (i1, i2) => {
        const key = [Math.min(i1, i2), Math.max(i1, i2)].join(",");
        if (!edgeMap.has(key)) {
          edgeMap.set(key, { count: 0, facing: [facingCamera] });
        } else {
          edgeMap.get(key).count++;
          edgeMap.get(key).facing.push(facingCamera);
        }
      };

      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }

    const screenEdges = [];

    edgeMap.forEach((data, key) => {
      const [ia, ib] = key.split(",").map(Number);
      if (data.facing.length === 2 && data.facing[0] !== data.facing[1]) {
        const ax = new THREE.Vector3(
          vertices[ia * 3],
          vertices[ia * 3 + 1],
          vertices[ia * 3 + 2]
        )
          .applyMatrix4(worldMatrix)
          .project(camera);

        const bx = new THREE.Vector3(
          vertices[ib * 3],
          vertices[ib * 3 + 1],
          vertices[ib * 3 + 2]
        )
          .applyMatrix4(worldMatrix)
          .project(camera);

        screenEdges.push({
          ax: ((ax.x + 1) / 2) * window.innerWidth,
          ay: ((-ax.y + 1) / 2) * window.innerHeight,
          bx: ((bx.x + 1) / 2) * window.innerWidth,
          by: ((-bx.y + 1) / 2) * window.innerHeight,
        });
      }
    });

    return screenEdges;
  }

  // const optimizeSVG = (svgString) => {
  //   const result = optimize(svgString, {
  //     multipass: true,
  //     plugins: [
  //       "removeDoctype",
  //       "removeXMLProcInst",
  //       "removeComments",
  //       "removeMetadata",
  //       "mergePaths",
  //       "collapseGroups",
  //       {
  //         name: "sortAttrs",
  //         params: {
  //           xmlnsOrder: "alphabetical",
  //         },
  //       },
  //     ],
  //   });
  //   return result.data;
  // };

//   const exportSilhouetteEdges = () => {
//     const scene = sceneRef.current;
//     const camera = cameraRef.current;
//     const model = modelRef.current;

//     if (!model) {
//       alert("🚫 Model not ready yet.");
//       return;
//     }

//     const allEdges = [];
//     model.traverse((child) => {
//       if (child.isMesh && child.geometry) {
//         const edges = getVisibleSilhouetteEdges(child, camera);
//         allEdges.push(...edges);
//       }
//     });

//     if (allEdges.length === 0) {
//       alert("🚫 No edges found.");
//       return;
//     }

//     const polygons = chainEdges(allEdges);

//     let svg = `<?xml version="1.0" encoding="UTF-8"?>
// <svg width="${window.innerWidth}" height="${window.innerHeight}" xmlns="http://www.w3.org/2000/svg">
//   <g fill="black" stroke="none">`;

//     polygons.forEach((chain) => {
//       const d =
//         chain
//           .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
//           .join(" ") + " Z";
//       svg += `\n    <path d="${d}"/>`;
//     });

//     svg += `\n  </g>\n</svg>`;

//     // تحسين SVG قبل التصدير
//     const optimizedSVG = optimizeSVG(svg);

//     const blob = new Blob([optimizedSVG], { type: "image/svg+xml" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "silhouette.svg";
//     a.click();
//     URL.revokeObjectURL(url);
//   };
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const reader = new FileReader();

    if (file.name.endsWith(".glb")) {
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const loader = new GLTFLoader();
        loader.parse(arrayBuffer, "", (gltf) => {
          const model = gltf.scene;
          sceneRef.current.add(model);
          modelRef.current = model;

          const cameras = [];
          model.traverse((child) => {
            if (child.isCamera) cameras.push(child);
          });
          if (cameras.length > 0) {
            setGlbCamera(cameras[0]);
          }
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith(".obj")) {
      reader.onload = () => {
        const objText = reader.result;
        const loader = new OBJLoader();
        const object = loader.parse(objText);
        sceneRef.current.add(object);
        modelRef.current = object;
      };
      reader.readAsText(file); // OBJ is text-based
    } else if (file.name.endsWith(".svg")) {
      reader.onload = () => setSvgContent(reader.result);
      reader.readAsText(file);
    } else {
      alert("يرجى رفع ملف GLB أو OBJ أو SVG فقط.");
    }
  };

  const exportModelToColoredSVG = () => {
    const model = modelRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;


    // 
    // check for debug
    const notReady = [];

    if (!model) notReady.push("model");
    if (!camera) notReady.push("camera");
    if (!renderer) notReady.push("renderer");

    if (notReady.length > 0) {
      alert(`${notReady.join(", ")} not ready!`);
      return;
    }
  // 

    const width = renderer.domElement.width;
    const height = renderer.domElement.height;

    const svgPolygons = [];

    // const vector = new THREE.Vector3();
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);

    model.updateWorldMatrix(true, true);

    let meshCount = 0;
    let materialCount = 0;
    const uniqueMaterials = new Set();


    model.traverse((child) => {
      if (child.isMesh) {
        // count models
            meshCount++;

            let materials = Array.isArray(child.material)
              ? child.material
              : [child.material];

            materials.forEach((mat) => {
              if (mat) {
                materialCount++;

                const color = mat.color?.getHexString?.(); // color as hex string
                if (color) {
                  uniqueMaterials.add(color); // add to set
                }
              }
            });



        
        const geometry = child.geometry.clone();
        geometry.applyMatrix4(child.matrixWorld);

        const position = geometry.attributes.position;
        const index = geometry.index;
        if (!index) return;

        const material = child.material;
        const color = Array.isArray(material)
          ? material[0].color || new THREE.Color("gray")
          : material.color || new THREE.Color("gray");

        const hexColor = color.getStyle();

        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        const c = new THREE.Vector3();
        const ab = new THREE.Vector3();
        const ac = new THREE.Vector3();
        const normal = new THREE.Vector3();
        const faceCenter = new THREE.Vector3();
        const toCamera = new THREE.Vector3();

        for (let i = 0; i < index.count; i += 3) {
          a.fromBufferAttribute(position, index.getX(i));
          b.fromBufferAttribute(position, index.getX(i + 1));
          c.fromBufferAttribute(position, index.getX(i + 2));

          // احسب النورمال
          ab.subVectors(b, a);
          ac.subVectors(c, a);
          normal.crossVectors(ab, ac).normalize();

          // احسب اتجاه الكاميرا
          faceCenter.addVectors(a, b).add(c).divideScalar(3);
          toCamera.subVectors(cameraPosition, faceCenter).normalize();

          // dot product يحدد إذا كان الوجه ظاهر للكاميرا
          if (normal.dot(toCamera) <= 0) continue;

          // إسقاط النقاط
          const points = [];
          [a, b, c].forEach((v) => {
            const projected = v.clone().project(camera);
            const x = ((projected.x + 1) / 2) * width;
            const y = ((-projected.y + 1) / 2) * height;
            points.push(`${x},${y}`);
          });

          const polygon = `<polygon points="${points.join(
            " "
          )}" fill="${hexColor}" stroke="black" stroke-width="0.25"/>`;
          svgPolygons.push(polygon);
        }
      }
    });

    const svgContent = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${svgPolygons.join("\n")}
  </svg>
  `;

    console.log(`عدد المجسمات (Meshes): ${meshCount}`);
    console.log(`عدد المواد (Materials): ${materialCount}`);
    console.log(`عدد المواد الفريدة (Unique Materials): ${uniqueMaterials.size}`);

    
  
    // DONT DELETE IT !!!! 

    // donload the svg file: 
    // const blob = new Blob([svgContent], { type: "image/svg+xml" });
    // const url = URL.createObjectURL(blob);
    // const a = document.createElement("a");
    // a.href = url;
    // a.download = "visible_faces.svg";
    // a.click();
    // URL.revokeObjectURL(url);
    
    // dont delete it !!!! 
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <button
        onClick={goToModelCamera}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          padding: "10px 15px",
        }}
      >
        👁 اذهب لمنظور الكاميرا داخل الملف
      </button>

      {/* <button
        onClick={exportSilhouetteEdges}
        style={{
          position: "absolute",
          top: 60,
          left: 10,
          zIndex: 10,
          padding: "10px 15px",
        }}
      >
         تصدير الحواف الخارجية كـ SVG
      </button> */}
      <button
        onClick={exportModelToColoredSVG}
        style={{
          position: "absolute",
          top: 110,
          left: 10,
          zIndex: 10,
          padding: "10px 15px",
        }}
      >
        Export colored faces as a SVG 
      </button>

      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
      />
    </div>
  );
}

// const exportSilhouetteEdges = () => {
//   const scene = sceneRef.current;
//   const camera = cameraRef.current;
//   const model = modelRef.current;

//   if (!model) {
//     alert("🚫 Model not ready yet.");
//     return;
//   }

//   const cameraDirection = new THREE.Vector3();
//   camera.updateMatrixWorld();
//   camera.getWorldDirection(cameraDirection);

//   const edgeGroups = [];

//   model.traverse((child) => {
//     if (child.isMesh && child.geometry) {
//       const edgesGeometry = new THREE.EdgesGeometry(child.geometry);
//       const position = edgesGeometry.attributes.position;
//       const worldA = new THREE.Vector3();
//       const worldB = new THREE.Vector3();

//       const shapeEdges = [];

//       for (let i = 0; i < position.count; i += 2) {
//         const a = new THREE.Vector3().fromBufferAttribute(position, i);
//         const b = new THREE.Vector3().fromBufferAttribute(position, i + 1);

//         // تحويل للنظام العالمي
//         worldA.copy(a);
//         worldB.copy(b);
//         child.localToWorld(worldA);
//         child.localToWorld(worldB);

//         // الإسقاط على الشاشة
//         const pa = worldA.clone().project(camera);
//         const pb = worldB.clone().project(camera);

//         const ax = ((pa.x + 1) / 2) * window.innerWidth;
//         const ay = ((-pa.y + 1) / 2) * window.innerHeight;
//         const bx = ((pb.x + 1) / 2) * window.innerWidth;
//         const by = ((-pb.y + 1) / 2) * window.innerHeight;

//         shapeEdges.push({ ax, ay, bx, by });
//       }

//       if (shapeEdges.length > 0) {
//         edgeGroups.push(shapeEdges);
//       }
//     }
//   });

//   if (edgeGroups.length === 0) {
//     alert("🚫 No edges found.");
//     return;
//   }

//   // تصدير SVG
//   let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
//   svg += `<svg width="${window.innerWidth}" height="${window.innerHeight}" xmlns="http://www.w3.org/2000/svg">\n`;
//   svg += `  <g id="edges" stroke="black" stroke-width="1" fill="none">\n`;

//   edgeGroups.forEach((group, i) => {
//     svg += `    <g id="shape-${i}">\n`;
//     group.forEach(({ ax, ay, bx, by }) => {
//       svg += `      <path d="M${ax},${ay} L${bx},${by}" />\n`;
//     });
//     svg += `    </g>\n`;
//   });

//   svg += `  </g>\n</svg>`;

//   const blob = new Blob([svg], { type: "image/svg+xml" });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = "shapes_edges.svg";
//   a.click();
//   URL.revokeObjectURL(url);
// };
