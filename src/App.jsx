// for the outline on click
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";

// App.jsx
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { uniteSVGFromContent } from "./svgUtils";

export default function App() {
  const [exportMode, setExportMode] = useState("color");
  const [modelsList, setModelsList] = useState([]);

  // for outline
  const composerRef = useRef();
  const outlinePassRef = useRef();

  // for recet the
  const initialCameraPositionRef = useRef();
  const initialTargetRef = useRef();

  const containerRef = useRef();
  const cameraRef = useRef();
  const sceneRef = useRef();
  const modelRef = useRef();
  const controlsRef = useRef();
  const rendererRef = useRef();

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

    // اضافة الجريد اللي تحت المجسمات
    const grid = new THREE.GridHelper(10, 20, 0x999999, 0xcccccc);
    grid.name = "__grid__"; // اسم مميز يسهل استبعاده لاحقًا
    scene.add(grid);

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

    // لما تدوس علي مجسم يتعمله اوتلاين
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      scene,
      camera
    );
    composer.addPass(outlinePass);

    // إعدادات اختيارية للتأثير
    outlinePass.edgeStrength = 2;
    outlinePass.edgeGlow = 0.5;
    outlinePass.edgeThickness = 1;
    outlinePass.visibleEdgeColor.set("#00ffff");
    outlinePass.hiddenEdgeColor.set("#000000");

    composerRef.current = composer;
    outlinePassRef.current = outlinePass;

    // مرجع بحيث لو بعدت عن نقطة الاصل اعرف ارجعلها
    initialCameraPositionRef.current = camera.position.clone();
    initialTargetRef.current = controls.target.clone();

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

    // loader.load("/base.glb", (gltf) => {
    //   const model = gltf.scene;
    //   scene.add(model);
    //   modelRef.current = model;

    //   const cameras = [];
    //   gltf.scene.traverse((child) => {
    //     if (child.isCamera) {
    //       cameras.push(child);
    //     }
    //   });

    //   if (cameras.length > 0) {
    //     console.log("📷 Camera found in model");
    //     setGlbCamera(cameras[0]);
    //   } else {
    //     console.warn("⚠️ No camera found in glb file.");
    //   }
    // });

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // const animate = () => {
    //   requestAnimationFrame(animate);
    //   controls.update();
    //   renderer.render(scene, camera);
    // };
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      composer.render(); // ⬅️ بدل renderer
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

  // الخاصة بالاوتلاين لما تضغط علي موديل
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  useEffect(() => {
    const rendererDom = rendererRef.current?.domElement;
    if (!rendererDom) return;

    const handleClick = (event) => {
      const bounds = rendererDom.getBoundingClientRect();
      mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      mouse.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const intersects = raycaster.intersectObjects(
        sceneRef.current.children,
        true
      );

      if (intersects.length > 0) {
        const targetObject = intersects[0].object;
        outlinePassRef.current.selectedObjects = [targetObject];
        console.log("🖱️ Selected:", targetObject.name);
      } else {
        outlinePassRef.current.selectedObjects = [];
      }
    };

    rendererDom.addEventListener("click", handleClick);

    return () => {
      rendererDom.removeEventListener("click", handleClick);
    };
  }, [rendererRef.current]);

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

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const reader = new FileReader();

    const prevChildren = sceneRef.current.children.slice(); // قبل الإضافة

    if (file.name.endsWith(".glb")) {
      reader.onload = () => {
        const arrayBuffer = reader.result;
        const loader = new GLTFLoader();
        loader.parse(arrayBuffer, "", (gltf) => {
          const model = gltf.scene;
          sceneRef.current.add(model);
          modelRef.current = model;

          // update the models list
          // setModelsList((prev) => [...prev, ...model.children.filter(c => c.isMesh)]);
          setModelsList((prev) => [...prev, model]);

          // كشف الكاميرات
          const cameras = [];
          model.traverse((child) => {
            if (child.isCamera) cameras.push(child);
          });
          if (cameras.length > 0) setGlbCamera(cameras[0]);

          // كشف العناصر الجديدة
          const currentChildren = sceneRef.current.children;
          const added = currentChildren.filter(
            (child) => !prevChildren.includes(child)
          );
          if (added.length > 0) {
            console.log("📦 موديلات جديدة دخلت للمشهد:");
            added.forEach((obj) =>
              console.log("🆕", obj.name || obj.type, obj)
            );
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

        // update the models list
        // setModelsList((prev) => [...prev, ...model.children.filter(c => c.isMesh)]);
        setModelsList((prev) => [...prev, model]);

        // كشف العناصر الجديدة
        const currentChildren = sceneRef.current.children;
        const added = currentChildren.filter(
          (child) => !prevChildren.includes(child)
        );
        if (added.length > 0) {
          console.log("📦 موديلات جديدة دخلت للمشهد:");
          added.forEach((obj) => console.log("🆕", obj.name || obj.type, obj));
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith(".svg")) {
      reader.onload = () => setSvgContent(reader.result);
      reader.readAsText(file);
    } else {
      alert("يرجى رفع ملف GLB أو OBJ أو SVG فقط.");
    }
  };

  const handleDownload = async (svgContent) => {
    const simplifiedSvg = await uniteSVGFromContent(svgContent, exportMode);
    const blob = new Blob([simplifiedSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "merged_faces.svg";
    a.click();
    URL.revokeObjectURL(url);
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
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);

    model.updateWorldMatrix(true, true);

    let meshCount = 0;
    let materialCount = 0;
    const uniqueMaterials = new Set();

    model.traverse((child) => {
      // if (child.name === "__grid__") return; // تجاهل الشبكة تمامًا
      // if (!child.isMesh) return;
      if (
        !child.isMesh ||
        child.name === "__grid__" ||
        child.name === "__outline__" || // ← لو عايز تسميه بنفسك
        child.type.includes("Line") ||
        child.material?.name === "OutlineMaterial" // ← إن سمّيت الماتريال كده
      ) {
        return;
      }

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
          )}" fill="${hexColor}" stroke="black" stroke-width="0.25" data-model="${
            child.name
          }"/>`;
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
    console.log(
      `عدد المواد الفريدة (Unique Materials): ${uniqueMaterials.size}`
    );

    handleDownload(svgContent);
  };

  const resetCameraView = () => {
    if (
      cameraRef.current &&
      controlsRef.current &&
      initialCameraPositionRef.current &&
      initialTargetRef.current
    ) {
      cameraRef.current.position.copy(initialCameraPositionRef.current);
      controlsRef.current.target.copy(initialTargetRef.current);
      controlsRef.current.update();
    }
  };

  const selectObjectByName = (name) => {
    const scene = sceneRef.current;
    const found = scene.getObjectByName(name);
    if (found) {
      outlinePassRef.current.selectedObjects = [found];
      console.log("🎯 Selected via UI:", name);
    }
  };

  console.log(modelsList[0]);
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* لوحة التحكم العلوية */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          backgroundColor: "#ffffffdd",
          padding: "12px",
          borderRadius: "10px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          minWidth: "250px",
        }}
      >
        <button onClick={goToModelCamera} style={buttonStyle}>
          اذهب إلى منظور الكاميرا داخل الملف
        </button>

        <button onClick={resetCameraView} style={buttonStyle}>
          الرجوع إلى مركز المشهد
        </button>

        <button onClick={exportModelToColoredSVG} style={buttonStyle}>
          تصدير الأوجه الملونة كـ SVG
        </button>

        <label style={checkboxLabelStyle}>
          <input
            type="checkbox"
            checked={exportMode === "model-color"}
            onChange={(e) =>
              setExportMode(e.target.checked ? "model-color" : "color")
            }
          />
          <span>تصدير كل مجسم على حدة (حسب المجسم واللون)</span>
        </label>
      </div>

      {/* قائمة العناصر في المشهد */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          right: 10,
          zIndex: 10,
          backgroundColor: "#ffffffdd",
          padding: "12px",
          borderRadius: "10px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          maxHeight: "300px",
          overflowY: "auto",
          minWidth: "250px",
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            marginBottom: "8px",
            color: "#333",
            fontSize: "16px",
          textAlign:"right"

          }}
        >
          العناصر داخل المشهد:
        </div>
        <ul style={{
          listStyle:"none",
        }}>
          {modelsList[0]?.children?.map((e) => (
            <li>
              <button
                key={e.uuid}
                onClick={() => selectObjectByName(e.name)}
                style={{
                  maxWidth: "250px",

                  backgroundColor: "#f3f4f6",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  width: "100%",
                  textAlign: "right",
                  color: "#1e3a8a",
                  fontSize: "14px",
                  fontWeight: "500",
                  border: "none",
                  cursor: "pointer",
                  marginBottom: "6px",
                }}
              >
                {e.name || "بدون اسم"}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ساحة العرض */}
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
//  أسلوب موحد للأزرار
const buttonStyle = {
  padding: "10px",
  backgroundColor: "#1e40af",
  color: "white",
  fontSize: "14px",
  fontWeight: "500",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

//  تنسيق للـ Checkbox
const checkboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "14px",
  color: "#333",
};
