/**
 * Author: Cristion Dominguez
 * Date: 8 April 2022
 */

/*
VERTEX COORDINATE:
s(t, theta) =

[cos(theta)   0  sin(theta)]
[    0        1      0     ]
[-sin(theta)  0  cos(theta)]

X

[  1 ]
[  t ]
[  0 ]

=

[cos(theta)]
[      t   ]
[-sin(theta)]

EXACT NORMAL:
h = normalize(ds/dtheta X ds/dt)

ds/dt =
[0]
[1]
[0]

ds/dtheta = 
[-sin(theta)]
[     0     ]
[-cos(theta)]
*/

/**
 * Pushes the vertex coordinates, normals, and order necessary for rendering a cylinder into the provided arrays.
 * @param {*} tEvaluations amount of vertices to place on the SOR curve
 * @param {*} thetaEvaluations amount of SOR curves around the y-axis
 * @param {*} vertexCoordinates coordinates of each vertex
 * @param {*} vertexNormals exact normals at each vertex
 * @param {*} vertexOrder order the vertices shall be drawn (contains vertex indices)
 * @returns minmax box
 */
function constructCylinder(tEvaluations, thetaEvaluations, vertexCoordinates, vertexNormals, vertexOrder)
{
    var cylinderSOR = (t, theta) => vec4(Math.cos(theta), t, -Math.sin(theta));

    var cylinderVertexNormal = (t, theta) => {
        var d_t = vec3(0, 1, 0);
        var d_theta = vec3(-Math.sin(theta), 0, -Math.cos(theta));
        var normal = normalize(cross(d_theta, d_t), false);
        return vec4(normal[0], normal[1], normal[2], 0);
    };

    var newIndex = vertexCoordinates.length;

    var tStep = -2 / (tEvaluations - 1);
    var thetaStep = (2 * Math.PI) / thetaEvaluations;

    var t = 1;
    for (var i = 0; i < tEvaluations; i++)
    {
        var theta = 0;
        for (var j = 0; j < thetaEvaluations; j++)
        {
            var point = cylinderSOR(t, theta);
            vertexCoordinates.push(point);

            var normal = cylinderVertexNormal(t, theta);
            vertexNormals.push(normal);

            theta += thetaStep;
        }

        t += tStep;
    }

    // COLUMN INDICES
    // [0,  1,  2,  3,  4
    //  5,  6,  7,  8,  9
    //  10, 11, 12, 13, 14]
    var topRightPointIndex, topLeftPointIndex, bottomLeftPointIndex, bottomRightPointIndex;
    for (var i = 0; i < tEvaluations - 1; i++)
    {
        var topStartingIndex = newIndex + i * thetaEvaluations;
        var bottomStartingIndex = newIndex + (i + 1) * thetaEvaluations;

        for (var j = 0; j < thetaEvaluations - 1; j++)
        {
            topRightPointIndex = topStartingIndex + (j + 1);
            topLeftPointIndex = topStartingIndex + j;
            bottomLeftPointIndex = bottomStartingIndex + j;
            bottomRightPointIndex = bottomStartingIndex + (j + 1);
            vertexOrder.push(topRightPointIndex, topLeftPointIndex, bottomLeftPointIndex, topRightPointIndex, bottomLeftPointIndex, bottomRightPointIndex);
        }

        topRightPointIndex = topStartingIndex;
        topLeftPointIndex = topStartingIndex + (thetaEvaluations - 1);
        bottomLeftPointIndex = bottomStartingIndex + (thetaEvaluations - 1);
        bottomRightPointIndex = bottomStartingIndex;
        vertexOrder.push(topRightPointIndex, topLeftPointIndex, bottomLeftPointIndex, topRightPointIndex, bottomLeftPointIndex, bottomRightPointIndex);
    }

    var topMiddlePoint = vec4(0, 1, 0);
    var bottomMiddlePoint = vec4(0, -1, 0);
    
    var topMiddleNormal = vec4(0, 1, 0);
    var bottomMiddleNormal = vec4(0, -1, 0);

    vertexCoordinates.push(topMiddlePoint, bottomMiddlePoint);
    vertexNormals.push(topMiddleNormal, bottomMiddleNormal);

    var topStartingIndex = newIndex;
    var topMiddleIndex = vertexCoordinates.length - 2;
    for(var i = 0; i < thetaEvaluations - 1; i++)
    {
        topLeftPointIndex = topStartingIndex + i;
        topRightPointIndex = topStartingIndex + i + 1;
        vertexOrder.push(topLeftPointIndex, topRightPointIndex, topMiddleIndex);
    }
    vertexOrder.push(topStartingIndex + thetaEvaluations - 1, topStartingIndex, topMiddleIndex);

    var bottomStartingIndex = topStartingIndex + ((tEvaluations - 1) * thetaEvaluations);
    var bottomMiddleIndex = vertexCoordinates.length - 1;
    for(var i = 0; i < thetaEvaluations - 1; i++)
    {
        bottomRightPointIndex = bottomStartingIndex + i + 1;
        bottomLeftPointIndex = bottomStartingIndex + i;
        vertexOrder.push(bottomRightPointIndex, bottomLeftPointIndex, bottomMiddleIndex);
    }
    vertexOrder.push(bottomStartingIndex + thetaEvaluations - 1, bottomStartingIndex, bottomMiddleIndex);

    return [vec3(-1, -1, -1), vec3(1, 1, 1)];
}

/*
VERTEX COORDINATE:
s(t, theta) =

[cos(theta)   0  sin(theta)]
[    0        1      0     ]
[-sin(theta)  0  cos(theta)]

X

[r * sin(t) + R]
[r * cos(t)]
[   0  ]

=

[cos(theta)(r * sin(t) + R)]
[    r * cos(t)            ]
[-sin(theta)(r * sin(t) + R)]
*/

/*
EXACT NORMAL:
h = normalize(ds/dt X ds/dtheta)

ds/dt =
[cos(theta) * r * cos(t)]
[    -r * sin(t)   ]
[-sin(theta) * r * cos(t)]

ds/dtheta = 
[-sin(theta)(r * sin(t) + R)]
[         0       ]
[-cos(theta)(r * sin(t) + R)]
*/

/**
 * Pushes the vertex coordinates, normals, and order necessary for rendering a ring into the provided arrays.
 * @param {*} majorRadius major radius of ring
 * @param {*} minorRadius minor radius of ring
 * @param {*} tEvaluations amount of vertices to place on the SOR curve
 * @param {*} thetaEvaluations amount of SOR curves around the y-axis
 * @param {*} vertexCoordinates coordinates of each vertex
 * @param {*} vertexNormals exact normals at each vertex
 * @param {*} vertexOrder order the vertices shall be drawn (contains vertex indices)
 * @returns minmax box
 */
function constructRing(majorRadius, minorRadius, tEvaluations, thetaEvaluations, vertexCoordinates, vertexNormals, vertexOrder)
{
    var ringSOR = (t, theta) => vec4(Math.cos(theta) * (minorRadius * Math.sin(t) + majorRadius), minorRadius * Math.cos(t), -Math.sin(theta) * (minorRadius * Math.sin(t) + majorRadius));

    var ringVertexNormal = (t, theta) => {
        var d_t = vec3(Math.cos(theta) * minorRadius * Math.cos(t), -minorRadius * Math.sin(t), -Math.sin(theta) * minorRadius * Math.cos(t));
        var d_theta = vec3(-Math.sin(theta) * (minorRadius * Math.sin(t) + majorRadius), 0, -Math.cos(theta) * (minorRadius * Math.sin(t) + majorRadius));
        var normal = normalize(cross(d_t, d_theta), false);
        return vec4(normal[0], normal[1], normal[2], 0);
    };

    var newIndex = vertexCoordinates.length;

    var tStep = (2 * Math.PI) / tEvaluations;
    var thetaStep = (2 * Math.PI) / thetaEvaluations;

    var t = 0;
    for (var i = 0; i < tEvaluations; i++)
    {
        var theta = 0;
        for (var j = 0; j < thetaEvaluations; j++)
        {
            var point = ringSOR(t, theta);
            vertexCoordinates.push(point);

            var normal = ringVertexNormal(t, theta);
            vertexNormals.push(normal);

            theta += thetaStep;
        }

        t += tStep;
    }

    // COLUMN INDICES
    // [0,  1,  2,  3,  4
    //  5,  6,  7,  8,  9
    //  10, 11, 12, 13, 14]
    var topRightPointIndex, topLeftPointIndex, bottomLeftPointIndex, bottomRightPointIndex;
    for (var i = 0; i < tEvaluations; i++)
    {
        var topStartingIndex, bottomStartingIndex;
        if (i < tEvaluations - 1)
        {
            topStartingIndex = newIndex + i * thetaEvaluations;
            bottomStartingIndex = newIndex + (i + 1) * thetaEvaluations;
        }
        else
        {
            topStartingIndex = newIndex + ((i - 1) * thetaEvaluations);
            bottomStartingIndex = newIndex;
        }        

        for (var j = 0; j < thetaEvaluations - 1; j++)
        {
            topRightPointIndex = topStartingIndex + (j + 1);
            topLeftPointIndex = topStartingIndex + j;
            bottomLeftPointIndex = bottomStartingIndex + j;
            bottomRightPointIndex = bottomStartingIndex + (j + 1);
            vertexOrder.push(topRightPointIndex, topLeftPointIndex, bottomLeftPointIndex, topRightPointIndex, bottomLeftPointIndex, bottomRightPointIndex);
        }

        topRightPointIndex = topStartingIndex;
        topLeftPointIndex = topStartingIndex + (thetaEvaluations - 1);
        bottomLeftPointIndex = bottomStartingIndex + (thetaEvaluations - 1);
        bottomRightPointIndex = bottomStartingIndex;
        vertexOrder.push(topRightPointIndex, topLeftPointIndex, bottomLeftPointIndex, topRightPointIndex, bottomLeftPointIndex, bottomRightPointIndex);
    }

    return [vec3(-majorRadius - minorRadius, -minorRadius, -majorRadius - minorRadius), vec3(majorRadius + minorRadius, minorRadius, majorRadius + minorRadius)];
}

/**
 * Pushes the vertex coordinates, normals, and order necessary for rendering the vertex normals of a surface.
 * @param {*} lineLength length the line should be
 * @param {*} firstVertexIndex index of the first vertex for the surface in vertexCoordinates
 * @param {*} lastVertexIndex index of the last vertex for the surface
 * @param {*} vertexCoordinates coordinates of each vertex
 * @param {*} vertexNormals exact normals at each vertex
 * @param {*} vertexOrder order the vertices shall be drawn (contains vertex indices)
 */
function constructSurfaceNormalLines(lineLength, firstVertexIndex, lastVertexIndex, vertexCoordinates, vertexNormals, vertexOrder)
{
    for (var i = firstVertexIndex; i <= lastVertexIndex; i++)
    {
        vertexCoordinates.push(add(vertexCoordinates[i], scale(lineLength, vertexNormals[i])));
        vertexOrder.push(i, vertexCoordinates.length - 1);
    }
}