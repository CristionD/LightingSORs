# Surfaces of Rotation Lighting
## Execution
Clone the repository or download all the files, then open 'index.html'.

## Description
This program renders two surfaces of rotation (SORs): cylinder, ring. SORs are constructed by rotating a curve on some plane around an axis. The rendered SORs were each constructed by calculating coordinates of limited vertices on a curve and duplicating those vertices around the y-axis a fixed set of times; all the vertices were then connected as rectangles, which were two triangles in disguise.

The surfaces are Gouraud shaded where Phong illumination at each vertex is based on their exact normal. Color at each vertex is dicted by the light position; the ambient, diffuse, and specular properties of the light; and the ambient reflectance, diffuse reflectance, specular reflectance, and shininess of the material assigned to the vertex.

The viewer is always facing the cylinder and rings due to a constantly updated Viewing Matrix positioning the SORs in front of the viewer. The viewer can only alter their distance from the SORs or the angles they observe the SORs from. On top of the Viewing Matrix is a Projection Matrix, which is calculated by the FOV and aspect ratio, as well as the near and far clipping distances.

Other than those essential components, there are multiple rings rotating around the cylinder. To achieve such an effect, each ring is translated on the x-axis the same amount whilst their y-position differs based on the amount of rings present. Then each ring is rotated around the y-axis where the angle is a combination of time and a unique offset.