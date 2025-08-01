// // import fs from "fs";
// import { parse, stringify } from "svgson";
// import ClipperLib from "clipper-lib";

//  const SCALE = 1000;

//   function svgPointsToPolygon(d) {
//     const numbers = d.match(/[-+]?[0-9]*\.?[0-9]+/g)?.map(Number);
//     if (!numbers || numbers.length < 6) return null;

//     const points = [];
//     for (let i = 0; i < numbers.length; i += 2) {
//       points.push({
//         X: Math.round(numbers[i] * SCALE),
//         Y: Math.round(numbers[i + 1] * SCALE),
//       });
//     }
//     return points;
//   }

//   export async function uniteSVGFromContent(svgContent) {
//     const parsed = await window.svgson.parse(svgContent);
//     const shapesByColor = {};

//     parsed.children.forEach((el) => {
//       const fill = el.attributes.fill || "#000000";
//       let poly = null;

//       if (el.name === "path" && el.attributes.d) {
//         poly = svgPointsToPolygon(el.attributes.d);
//       } else if (el.name === "polygon" && el.attributes.points) {
//         poly = svgPointsToPolygon(el.attributes.points);
//       }

//       if (poly) {
//         if (!shapesByColor[fill]) shapesByColor[fill] = [];
//         shapesByColor[fill].push(poly);
//       }
//     });

//     const svgPaths = [];

//     for (const [fillColor, polygons] of Object.entries(shapesByColor)) {
//       const clipper = new ClipperLib.Clipper();
//       clipper.AddPaths(polygons, ClipperLib.PolyType.ptSubject, true);

//       const solution = new ClipperLib.Paths();
//       clipper.Execute(
//         ClipperLib.ClipType.ctUnion,
//         solution,
//         ClipperLib.PolyFillType.pftNonZero,
//         ClipperLib.PolyFillType.pftNonZero
//       );

//       solution.forEach((path) => {
//         const d =
//           path
//             .map((p, i) => {
//               const x = p.X / SCALE;
//               const y = p.Y / SCALE;
//               return (i === 0 ? "M" : "L") + `${x},${y}`;
//             })
//             .join(" ") + " Z";

//         svgPaths.push({
//           name: "path",
//           type: "element",
//           attributes: { d, fill: fillColor },
//           children: [],
//         });
//       });
//     }

//     const newSVG = {
//       name: "svg",
//       type: "element",
//       attributes: {
//         xmlns: "http://www.w3.org/2000/svg",
//         viewBox: "0 0 1000 1000",
//       },
//       children: svgPaths,
//     };

//     return window.svgson.stringify(newSVG);
//   }
// svgUtils.js
import { parse, stringify } from "svgson";
import ClipperLib from "clipper-lib";

const SCALE = 1000;

function svgPointsToPolygon(d) {
  const numbers = d.match(/[-+]?[0-9]*\.?[0-9]+/g)?.map(Number);
  if (!numbers || numbers.length < 6) return null;

  const points = [];
  for (let i = 0; i < numbers.length; i += 2) {
    points.push({
      X: Math.round(numbers[i] * SCALE),
      Y: Math.round(numbers[i + 1] * SCALE),
    });
  }
  return points;
}

// export async function uniteSVGFromContent(svgContent) {
//   const parsed = await parse(svgContent);
//   const shapesByColor = {};

//   parsed.children.forEach((el) => {
//     const fill = el.attributes.fill || "#000000";

//     let poly = null;

//     if (el.name === "path" && el.attributes.d) {
//       poly = svgPointsToPolygon(el.attributes.d);
//     } else if (el.name === "polygon" && el.attributes.points) {
//       poly = svgPointsToPolygon(el.attributes.points);
//     }

//     if (poly) {
//       if (!shapesByColor[fill]) shapesByColor[fill] = [];
//       shapesByColor[fill].push(poly);
//     }
//   });

//   const svgPaths = [];

//   for (const [fillColor, polygons] of Object.entries(shapesByColor)) {
//     const clipper = new ClipperLib.Clipper();
//     clipper.AddPaths(polygons, ClipperLib.PolyType.ptSubject, true);

//     const solution = new ClipperLib.Paths();
//     clipper.Execute(
//       ClipperLib.ClipType.ctUnion,
//       solution,
//       ClipperLib.PolyFillType.pftNonZero,
//       ClipperLib.PolyFillType.pftNonZero
//     );

//     solution.forEach((path) => {
//       const d =
//         path
//           .map((p, i) => {
//             const x = p.X / SCALE;
//             const y = p.Y / SCALE;
//             return (i === 0 ? "M" : "L") + `${x},${y}`;
//           })
//           .join(" ") + " Z";

//       svgPaths.push({
//         name: "path",
//         type: "element",
//         attributes: { d, fill: fillColor },
//         children: [],
//       });
//     });
//   }

//   const newSVG = {
//     name: "svg",
//     type: "element",
//     attributes: {
//       xmlns: "http://www.w3.org/2000/svg",
//       viewBox: "0 0 1000 1000",
//     },
//     children: svgPaths,
//   };

//   return stringify(newSVG);
// }

export async function uniteSVGFromContent(svgContent, groupBy = "color") {
  const parsed = await parse(svgContent);
  const shapesByKey = {};

  parsed.children.forEach((el) => {
    const fill = el.attributes.fill || "#000000";
    const model = el.attributes["data-model"] || "global";

    let key;
    if (groupBy === "model-color") {
      key = `${model}__${fill}`;
    } else {
      key = fill;
    }

    const poly =
      el.name === "path" && el.attributes.d
        ? svgPointsToPolygon(el.attributes.d)
        : el.name === "polygon" && el.attributes.points
        ? svgPointsToPolygon(el.attributes.points)
        : null;

    if (poly) {
      if (!shapesByKey[key]) shapesByKey[key] = [];
      shapesByKey[key].push(poly);
    }
  });

  const svgPaths = [];

  for (const [key, polygons] of Object.entries(shapesByKey)) {
    const [, fillColor] = key.includes("__") ? key.split("__") : [null, key];

    const clipper = new ClipperLib.Clipper();
    clipper.AddPaths(polygons, ClipperLib.PolyType.ptSubject, true);

    const solution = new ClipperLib.Paths();
    clipper.Execute(
      ClipperLib.ClipType.ctUnion,
      solution,
      ClipperLib.PolyFillType.pftNonZero,
      ClipperLib.PolyFillType.pftNonZero
    );

    solution.forEach((path) => {
      const d =
        path
          .map((p, i) => {
            const x = p.X / SCALE;
            const y = p.Y / SCALE;
            return (i === 0 ? "M" : "L") + `${x},${y}`;
          })
          .join(" ") + " Z";

      svgPaths.push({
        name: "path",
        type: "element",
        attributes: { d, fill: fillColor },
        children: [],
      });
    });
  }

  const newSVG = {
    name: "svg",
    type: "element",
    attributes: {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 1000 1000",
    },
    children: svgPaths,
  };

  return stringify(newSVG);
}
