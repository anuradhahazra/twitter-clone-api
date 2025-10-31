const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'twitterClone.db')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server running at http://localhost:3000/'),
    )
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

// JWT Middleware
const authenticateToken = (req, res, next) => {
  let jwtToken
  const authHeader = req.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    res.status(401)
    res.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_KEY', (error, payload) => {
      if (error) {
        res.status(401)
        res.send('Invalid JWT Token')
      } else {
        req.username = payload.username
        req.userId = payload.userId
        next()
      }
    })
  }
}

// API 1: Register
app.post('/register/', async (req, res) => {
  const {username, password, name, gender} = req.body
  const userQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(userQuery)

  if (dbUser !== undefined) {
    res.status(400)
    res.send('User already exists')
  } else if (password.length < 6) {
    res.status(400)
    res.send('Password is too short')
  } else {
    const hashedPassword = await bcrypt.hash(password, 10)
    const addUserQuery = `
      INSERT INTO user (username, password, name, gender)
      VALUES ('${username}', '${hashedPassword}', '${name}', '${gender}');
    `
    await db.run(addUserQuery)
    res.send('User created successfully')
  }
})

// API 2: Login
app.post('/login/', async (req, res) => {
  const {username, password} = req.body
  const userQuery = `SELECT * FROM user WHERE username = '${username}';`
  const dbUser = await db.get(userQuery)

  if (dbUser === undefined) {
    res.status(400)
    res.send('Invalid user')
  } else {
    const isPasswordCorrect = await bcrypt.compare(password, dbUser.password)
    if (isPasswordCorrect === true) {
      const payload = {username: username, userId: dbUser.user_id}
      const jwtToken = jwt.sign(payload, 'MY_SECRET_KEY')
      res.send({jwtToken})
    } else {
      res.status(400)
      res.send('Invalid password')
    }
  }
})

// API 3: User feed (latest 4 tweets)
app.get('/user/tweets/feed/', authenticateToken, async (req, res) => {
  const {userId} = req
  const query = `
    SELECT username, tweet, date_time AS dateTime
    FROM follower
    INNER JOIN tweet ON follower.following_user_id = tweet.user_id
    INNER JOIN user ON tweet.user_id = user.user_id
    WHERE follower.follower_user_id = ${userId}
    ORDER BY date_time DESC
    LIMIT 4;
  `
  const feed = await db.all(query)
  res.send(feed)
})

// API 4: Following list
app.get('/user/following/', authenticateToken, async (req, res) => {
  const {userId} = req
  const query = `
    SELECT name FROM follower
    INNER JOIN user ON follower.following_user_id = user.user_id
    WHERE follower.follower_user_id = ${userId};
  `
  const following = await db.all(query)
  res.send(following)
})

// API 5: Followers list
app.get('/user/followers/', authenticateToken, async (req, res) => {
  const {userId} = req
  const query = `
    SELECT name FROM follower
    INNER JOIN user ON follower.follower_user_id = user.user_id
    WHERE follower.following_user_id = ${userId};
  `
  const followers = await db.all(query)
  res.send(followers)
})

// Helper to check if user follows tweet owner
const checkAccessToTweet = async (userId, tweetId) => {
  const query = `
    SELECT * FROM follower
    INNER JOIN tweet ON follower.following_user_id = tweet.user_id
    WHERE follower.follower_user_id = ${userId}
      AND tweet.tweet_id = ${tweetId};
  `
  const result = await db.get(query)
  return result !== undefined
}

// API 6: Tweet details
app.get('/tweets/:tweetId/', authenticateToken, async (req, res) => {
  const {userId} = req
  const {tweetId} = req.params
  const access = await checkAccessToTweet(userId, tweetId)
  if (!access) {
    res.status(401)
    res.send('Invalid Request')
  } else {
    const query = `
      SELECT tweet,
             COUNT(DISTINCT like_id) AS likes,
             COUNT(DISTINCT reply_id) AS replies,
             date_time AS dateTime
      FROM tweet
      LEFT JOIN like ON tweet.tweet_id = like.tweet_id
      LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id
      WHERE tweet.tweet_id = ${tweetId};
    `
    const tweet = await db.get(query)
    res.send(tweet)
  }
})

// API 7: Tweet likes
app.get('/tweets/:tweetId/likes/', authenticateToken, async (req, res) => {
  const {userId} = req
  const {tweetId} = req.params
  const access = await checkAccessToTweet(userId, tweetId)
  if (!access) {
    res.status(401)
    res.send('Invalid Request')
  } else {
    const query = `
      SELECT username FROM like
      INNER JOIN user ON like.user_id = user.user_id
      WHERE like.tweet_id = ${tweetId};
    `
    const likes = await db.all(query)
    res.send({likes: likes.map(l => l.username)})
  }
})

// API 8: Tweet replies
app.get('/tweets/:tweetId/replies/', authenticateToken, async (req, res) => {
  const {userId} = req
  const {tweetId} = req.params
  const access = await checkAccessToTweet(userId, tweetId)
  if (!access) {
    res.status(401)
    res.send('Invalid Request')
  } else {
    const query = `
      SELECT name, reply FROM reply
      INNER JOIN user ON reply.user_id = user.user_id
      WHERE reply.tweet_id = ${tweetId};
    `
    const replies = await db.all(query)
    res.send({replies})
  }
})

// API 9: User's own tweets
app.get('/user/tweets/', authenticateToken, async (req, res) => {
  const {userId} = req
  const query = `
    SELECT tweet,
           COUNT(DISTINCT like_id) AS likes,
           COUNT(DISTINCT reply_id) AS replies,
           date_time AS dateTime
    FROM tweet
    LEFT JOIN like ON tweet.tweet_id = like.tweet_id
    LEFT JOIN reply ON tweet.tweet_id = reply.tweet_id
    WHERE tweet.user_id = ${userId}
    GROUP BY tweet.tweet_id;
  `
  const tweets = await db.all(query)
  res.send(tweets)
})

// API 10: Create Tweet
app.post('/user/tweets/', authenticateToken, async (req, res) => {
  const {userId} = req
  const {tweet} = req.body
  const query = `
    INSERT INTO tweet (tweet, user_id, date_time)
    VALUES ('${tweet}', ${userId}, datetime('now'));
  `
  await db.run(query)
  res.send('Created a Tweet')
})

// API 11: Delete Tweet
app.delete('/tweets/:tweetId/', authenticateToken, async (req, res) => {
  const {userId} = req
  const {tweetId} = req.params
  const query = `SELECT * FROM tweet WHERE tweet_id = ${tweetId} AND user_id = ${userId};`
  const tweet = await db.get(query)
  if (tweet === undefined) {
    res.status(401)
    res.send('Invalid Request')
  } else {
    const deleteQuery = `DELETE FROM tweet WHERE tweet_id = ${tweetId};`
    await db.run(deleteQuery)
    res.send('Tweet Removed')
  }
})

module.exports = app
